"""aKaBot API クライアント - REST経由でのジョブ起動・監視・ログ取得"""
from __future__ import annotations

import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)


class AkaBotClient:
    """aKaBot Center REST APIクライアント"""

    def __init__(
        self,
        base_url: str = "http://localhost:8080/api/v1",
        api_key: str = "",
        timeout: int = 300,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        if api_key:
            self.session.headers["Authorization"] = f"Bearer {api_key}"
        self.session.headers["Content-Type"] = "application/json"

    def start_job(
        self,
        robot_name: str,
        input_args: dict[str, Any] | None = None,
    ) -> str:
        """ロボットジョブを起動してジョブIDを返す"""
        payload = {
            "robotName": robot_name,
            "inputArguments": input_args or {},
        }
        try:
            resp = self.session.post(
                f"{self.base_url}/jobs",
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            job_id = resp.json().get("jobId", "")
            logger.info("ジョブ起動成功: %s (job_id=%s)", robot_name, job_id)
            return job_id
        except requests.RequestException as e:
            logger.error("ジョブ起動失敗: %s - %s", robot_name, e)
            raise

    def wait_for_completion(
        self,
        job_id: str,
        poll_interval: int = 5,
    ) -> dict[str, Any]:
        """ジョブ完了を待機して結果を返す"""
        elapsed = 0
        while elapsed < self.timeout:
            try:
                resp = self.session.get(
                    f"{self.base_url}/jobs/{job_id}",
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                status = data.get("status", "")

                if status in ("Completed", "Faulted", "Stopped"):
                    logger.info("ジョブ完了: %s (status=%s)", job_id, status)
                    return data

            except requests.RequestException as e:
                logger.warning("ステータス取得失敗: %s", e)

            time.sleep(poll_interval)
            elapsed += poll_interval

        logger.error("ジョブタイムアウト: %s", job_id)
        return {"status": "Timeout", "jobId": job_id}

    def get_job_logs(self, job_id: str) -> list[dict[str, Any]]:
        """ジョブのログを取得する"""
        try:
            resp = self.session.get(
                f"{self.base_url}/jobs/{job_id}/logs",
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json().get("logs", [])
        except requests.RequestException as e:
            logger.error("ログ取得失敗: %s - %s", job_id, e)
            return []

    def get_job_output(self, job_id: str) -> dict[str, Any]:
        """ジョブの出力引数を取得する"""
        try:
            resp = self.session.get(
                f"{self.base_url}/jobs/{job_id}/output",
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json().get("outputArguments", {})
        except requests.RequestException as e:
            logger.error("出力取得失敗: %s - %s", job_id, e)
            return {}

    def health_check(self) -> bool:
        """API接続確認"""
        try:
            resp = self.session.get(f"{self.base_url}/health", timeout=5)
            return resp.status_code == 200
        except requests.RequestException:
            return False
