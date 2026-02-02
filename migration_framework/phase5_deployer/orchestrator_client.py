"""Orchestrator API クライアント - パッケージ管理・プロセス管理・マシン管理"""
# Copyright (c) 2025-2026 HarmonicInsight / FPT Consulting Japan. All rights reserved.
from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger(__name__)


class OrchestratorClient:
    """aKaBot / UiPath Orchestrator REST APIクライアント

    対応する共通的なOrchestrator操作:
    - 認証 (OAuth / API Key)
    - パッケージのアップロード・管理
    - プロセスの作成・削除・割当
    - マシン（ロボット端末）の管理
    - ジョブの起動・監視
    """

    def __init__(
        self,
        base_url: str = "http://localhost:8080",
        tenant: str = "default",
        api_key: str | None = None,
        username: str | None = None,
        password: str | None = None,
        timeout: int = 60,
    ):
        self.base_url = base_url.rstrip("/")
        self.tenant = tenant
        self.api_key = api_key
        self.username = username
        self.password = password
        self.timeout = timeout
        self._token: str | None = None
        self._session = requests.Session()

    # --- 認証 ---

    def authenticate(self) -> str:
        """Orchestratorに認証してトークンを取得する"""
        if self.api_key:
            self._token = self.api_key
            self._session.headers["X-API-Key"] = self.api_key
            return self.api_key

        resp = self._session.post(
            f"{self.base_url}/api/account/authenticate",
            json={
                "tenancyName": self.tenant,
                "usernameOrEmail": self.username,
                "password": self.password,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        self._token = resp.json().get("result", resp.json().get("access_token", ""))
        self._session.headers["Authorization"] = f"Bearer {self._token}"
        logger.info("Orchestrator認証成功")
        return self._token

    # --- マシン(端末)管理 ---

    def get_machines(self) -> list[dict[str, Any]]:
        """登録済みマシン一覧を取得"""
        resp = self._session.get(
            f"{self.base_url}/odata/Machines",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        machines = resp.json().get("value", [])
        logger.info("マシン一覧取得: %d 台", len(machines))
        return machines

    def get_machine_status(self, machine_id: int) -> dict[str, Any]:
        """マシンの稼働状態を取得"""
        resp = self._session.get(
            f"{self.base_url}/odata/Machines({machine_id})",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def register_machine(
        self, name: str, machine_type: str = "Standard", description: str = ""
    ) -> int:
        """新規マシンを登録"""
        resp = self._session.post(
            f"{self.base_url}/odata/Machines",
            json={
                "Name": name,
                "Type": machine_type,
                "Description": description,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        machine_id = resp.json()["Id"]
        logger.info("マシン登録: %s (id=%d)", name, machine_id)
        return machine_id

    # --- パッケージ管理 ---

    def upload_package(self, package_path: Path) -> str:
        """パッケージ (.nupkg) をアップロード"""
        with open(package_path, "rb") as f:
            resp = self._session.post(
                f"{self.base_url}/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage",
                files={"file": (package_path.name, f, "application/octet-stream")},
                timeout=self.timeout * 3,
            )
        resp.raise_for_status()
        result = resp.json()
        package_id = result.get("Id", result.get("Key", package_path.stem))
        logger.info("パッケージアップロード完了: %s", package_id)
        return str(package_id)

    def get_packages(self) -> list[dict[str, Any]]:
        """アップロード済みパッケージ一覧"""
        resp = self._session.get(
            f"{self.base_url}/odata/Processes",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json().get("value", [])

    def delete_package(self, package_id: str) -> None:
        """パッケージを削除"""
        resp = self._session.delete(
            f"{self.base_url}/odata/Processes('{package_id}')",
            timeout=self.timeout,
        )
        resp.raise_for_status()
        logger.info("パッケージ削除: %s", package_id)

    # --- プロセス(リリース)管理 ---

    def create_process(
        self,
        package_id: str,
        process_name: str,
        environment_name: str = "Production",
    ) -> str:
        """パッケージからプロセス（リリース）を作成"""
        # 環境IDの取得
        env_resp = self._session.get(
            f"{self.base_url}/odata/Environments",
            params={"$filter": f"Name eq '{environment_name}'"},
            timeout=self.timeout,
        )
        env_resp.raise_for_status()
        environments = env_resp.json().get("value", [])
        env_id = environments[0]["Id"] if environments else 1

        resp = self._session.post(
            f"{self.base_url}/odata/Releases",
            json={
                "Name": process_name,
                "ProcessKey": package_id,
                "EnvironmentId": env_id,
                "Description": f"Migration auto-deploy: {process_name}",
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        process_id = str(resp.json()["Id"])
        logger.info("プロセス作成: %s (id=%s)", process_name, process_id)
        return process_id

    def assign_machine(self, process_id: str, machine_id: int) -> None:
        """プロセスにマシンを割り当て"""
        resp = self._session.post(
            f"{self.base_url}/odata/Releases('{process_id}')/UiPath.Server.Configuration.OData.AssignMachine",
            json={"MachineId": machine_id},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        logger.info("マシン割当: process=%s, machine=%d", process_id, machine_id)

    def stop_process(self, process_name: str) -> None:
        """プロセスに関連する実行中ジョブを全停止"""
        # 実行中ジョブ検索
        resp = self._session.get(
            f"{self.base_url}/odata/Jobs",
            params={
                "$filter": f"Release/Name eq '{process_name}' and State eq 'Running'",
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        jobs = resp.json().get("value", [])

        for job in jobs:
            self._session.post(
                f"{self.base_url}/odata/Jobs({job['Id']})/UiPath.Server.Configuration.OData.StopJob",
                json={"strategy": "SoftStop"},
                timeout=self.timeout,
            )
        logger.info("ジョブ停止: %s (%d件)", process_name, len(jobs))

    def delete_process(self, process_name: str) -> None:
        """プロセス（リリース）を削除"""
        resp = self._session.get(
            f"{self.base_url}/odata/Releases",
            params={"$filter": f"Name eq '{process_name}'"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        releases = resp.json().get("value", [])

        for release in releases:
            self._session.delete(
                f"{self.base_url}/odata/Releases({release['Id']})",
                timeout=self.timeout,
            )
        logger.info("プロセス削除: %s (%d件)", process_name, len(releases))

    # --- ジョブ実行(テスト・ヘルスチェック用) ---

    def start_job(
        self,
        process_name: str,
        machine_id: int | None = None,
        input_args: dict[str, Any] | None = None,
    ) -> str:
        """ジョブを起動する"""
        # リリースキー取得
        resp = self._session.get(
            f"{self.base_url}/odata/Releases",
            params={"$filter": f"Name eq '{process_name}'"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        releases = resp.json().get("value", [])
        if not releases:
            raise ValueError(f"プロセスが見つかりません: {process_name}")

        release_key = releases[0]["Key"]

        start_info: dict[str, Any] = {
            "ReleaseKey": release_key,
            "Strategy": "Specific" if machine_id else "ModernJobsCount",
        }
        if machine_id:
            start_info["RobotIds"] = [machine_id]
        if input_args:
            import json
            start_info["InputArguments"] = json.dumps(input_args)

        resp = self._session.post(
            f"{self.base_url}/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs",
            json={"startInfo": start_info},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        job_id = str(resp.json()["value"][0]["Id"])
        logger.info("ジョブ起動: %s (job_id=%s)", process_name, job_id)
        return job_id

    def wait_for_job(self, job_id: str, timeout: int = 300) -> dict[str, Any]:
        """ジョブ完了を待機してステータスを返す"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            resp = self._session.get(
                f"{self.base_url}/odata/Jobs({job_id})",
                timeout=self.timeout,
            )
            resp.raise_for_status()
            job = resp.json()
            state = job.get("State", "")

            if state in ("Successful", "Faulted", "Stopped"):
                return job

            time.sleep(5)

        return {"State": "Timeout", "Id": job_id}

    # --- 接続確認 ---

    def health_check(self) -> bool:
        """Orchestratorへの接続確認"""
        try:
            resp = self._session.get(
                f"{self.base_url}/api/status",
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False
