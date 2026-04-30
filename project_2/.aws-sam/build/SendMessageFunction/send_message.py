import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
MAX_TEXT_LEN = 1000


def _get_table():
    kwargs = {}
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.resource("dynamodb", **kwargs).Table(TABLE_NAME)


def handler(event, _context):
    try:
        rc = event["requestContext"]
        connection_id = rc["connectionId"]
        domain_name = rc["domainName"]
        stage = rc["stage"]

        # ── Parse and validate body ────────────────────────────────────────────
        try:
            body = json.loads(event.get("body") or "")
        except (json.JSONDecodeError, TypeError):
            return {"statusCode": 400, "body": "Invalid JSON body"}

        text = body.get("text", "")
        if not isinstance(text, str) or not text.strip():
            return {"statusCode": 400, "body": "Missing or invalid text"}
        if len(text) > MAX_TEXT_LEN:
            return {"statusCode": 400, "body": "Text exceeds 1000 characters"}

        # ── Look up sender's callsign (anti-spoofing) ──────────────────────────
        table = _get_table()
        resp = table.get_item(Key={"connectionId": connection_id})
        sender = resp.get("Item")
        if not sender:
            logger.warning("Unknown sender: %s", connection_id)
            return {"statusCode": 400, "body": "Unknown sender"}
        callsign = sender["callsign"]

        # ── Build broadcast payload ────────────────────────────────────────────
        payload = json.dumps({
            "type": "message",
            "callsign": callsign,
            "text": text,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }).encode("utf-8")

        # ── Scan all active connections (paginated) ────────────────────────────
        connections = []
        scan_kwargs = {"ProjectionExpression": "connectionId"}
        while True:
            scan_resp = table.scan(**scan_kwargs)
            connections.extend(scan_resp["Items"])
            if "LastEvaluatedKey" not in scan_resp:
                break
            scan_kwargs["ExclusiveStartKey"] = scan_resp["LastEvaluatedKey"]

        # ── Fan-out via PostToConnection ───────────────────────────────────────
        endpoint_url = f"https://{domain_name}/{stage}"
        apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

        for conn in connections:
            conn_id = conn["connectionId"]
            try:
                apigw.post_to_connection(ConnectionId=conn_id, Data=payload)
            except apigw.exceptions.GoneException:
                logger.info("Stale connection cleaned up: %s", conn_id)
                try:
                    table.delete_item(Key={"connectionId": conn_id})
                except Exception:
                    pass
            except Exception as e:
                logger.error("PostToConnection failed for %s: %s", conn_id, e)

        logger.info("Broadcasted message from %s (%s) to %d connection(s)",
                    callsign, connection_id, len(connections))
        return {"statusCode": 200, "body": "Message sent"}

    except ClientError as e:
        logger.error("DynamoDB error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
