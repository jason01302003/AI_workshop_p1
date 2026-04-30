import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]


def _get_table():
    kwargs = {}
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)


def _broadcast_user_left(domain_name, stage, callsign):
    """Push a user_left system event to all remaining connections."""
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
        "event": "user_left",
        "callsign": callsign,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }).encode("utf-8")

    for conn in connections:
        conn_id = conn["connectionId"]
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

        table = _get_table()

        # Read callsign before deletion so we can broadcast the leave event
        resp = table.get_item(Key={"connectionId": connection_id})
        item = resp.get("Item", {})
        callsign = item.get("callsign", "unknown")

        # Delete is idempotent — safe even if the record is already gone
        table.delete_item(Key={"connectionId": connection_id})
        logger.info("Disconnected: %s (%s)", connection_id, callsign)

        # Broadcast user_left to remaining connections (skip for local testing)
        if domain_name and domain_name != "localhost":
            try:
                _broadcast_user_left(domain_name, stage, callsign)
            except Exception as e:
                logger.warning("user_left broadcast failed (non-fatal): %s", e)

        return {"statusCode": 200, "body": "Disconnected"}

    except ClientError as e:
        logger.error("DynamoDB error on delete: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
