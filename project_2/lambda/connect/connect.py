import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
CALLSIGN_RE = re.compile(r"^[a-zA-Z0-9_]{1,20}$")


def _get_table():
    kwargs = {}
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)


def _broadcast_user_joined(domain_name, stage, callsign, exclude_id):
    """Push a user_joined system event to all connections except the new one."""
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)
    table = _get_table()

    # Paginated scan
    connections = []
    scan_kwargs = {"ProjectionExpression": "connectionId"}
    while True:
        resp = table.scan(**scan_kwargs)
        connections.extend(resp["Items"])
        if "LastEvaluatedKey" not in resp:
            break
        scan_kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    payload = json.dumps({
        "type": "system",
        "event": "user_joined",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }).encode("utf-8")

    for conn in connections:
        conn_id = conn["connectionId"]
        if conn_id == exclude_id:
            continue
        try:
            apigw.post_to_connection(ConnectionId=conn_id, Data=payload)
        except apigw.exceptions.GoneException:
            try:
                table.delete_item(Key={"connectionId": conn_id})
            except Exception:
                pass
        except Exception as e:
            logger.warning("broadcast skip %s: %s", conn_id, e)


def handler(event, _context):
    try:
        rc = event["requestContext"]
        connection_id = rc["connectionId"]
        domain_name = rc.get("domainName", "")
        stage = rc.get("stage", "")

        params = event.get("queryStringParameters") or {}
        callsign = params.get("callsign", "")

        if not callsign or not CALLSIGN_RE.match(callsign):
            logger.warning("Rejected callsign=%r for connection %s", callsign, connection_id)
            return {"statusCode": 400, "body": "Invalid or missing callsign"}

        table = _get_table()
        table.put_item(Item={
            "connectionId": connection_id,
            "callsign": callsign,
            "connectedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
        logger.info("Connected: %s as %s", connection_id, callsign)

        # Broadcast user_joined to existing connections (skip for local testing)
        if domain_name and domain_name != "localhost":
            try:
                _broadcast_user_joined(domain_name, stage, callsign, exclude_id=connection_id)
            except Exception as e:
                logger.warning("user_joined broadcast failed (non-fatal): %s", e)

        return {"statusCode": 200, "body": "Connected"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
