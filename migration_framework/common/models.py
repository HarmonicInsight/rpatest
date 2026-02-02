"""移行フレームワーク共通データモデル"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


class DifficultyRank(str, enum.Enum):
    A = "A"  # 簡単
    B = "B"  # 中程度
    C = "C"  # 複雑
    D = "D"  # 非常に複雑


class MigrationStatus(str, enum.Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    CONVERTING = "converting"
    VALIDATING = "validating"
    TESTING = "testing"
    COMPLETED = "completed"
    FAILED = "failed"
    MANUAL_REQUIRED = "manual_required"


class TestType(str, enum.Enum):
    SMOKE = "smoke"
    FUNCTIONAL = "functional"
    REGRESSION = "regression"
    LOAD = "load"


class TestResult(str, enum.Enum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class BizRoboAction:
    """BizRoboの1アクション"""
    action_type: str
    name: str
    properties: dict[str, Any] = field(default_factory=dict)
    children: list[BizRoboAction] = field(default_factory=list)
    line_number: int = 0


@dataclass
class BizRoboVariable:
    """BizRoboの変数定義"""
    name: str
    var_type: str
    default_value: str | None = None
    scope: str = "workflow"


@dataclass
class BizRoboRobot:
    """BizRoboロボットの解析結果"""
    file_path: Path
    name: str
    actions: list[BizRoboAction] = field(default_factory=list)
    variables: list[BizRoboVariable] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    external_connections: list[str] = field(default_factory=list)
    file_paths: list[str] = field(default_factory=list)
    api_calls: list[str] = field(default_factory=list)
    sub_robots: list[str] = field(default_factory=list)


@dataclass
class ComplexityScore:
    """複雑度スコア"""
    step_count: int = 0
    branch_depth: int = 0
    loop_depth: int = 0
    external_deps: int = 0
    total_score: float = 0.0
    rank: DifficultyRank = DifficultyRank.A
    risk_flags: list[str] = field(default_factory=list)


@dataclass
class AssessmentReport:
    """Phase1 出力: 解析レポート"""
    robot: BizRoboRobot
    complexity: ComplexityScore
    migration_priority: int = 0
    estimated_hours: float = 0.0
    auto_convertible_rate: float = 0.0
    manual_items: list[str] = field(default_factory=list)
    analyzed_at: datetime = field(default_factory=datetime.now)


@dataclass
class ASTNode:
    """中間AST表現"""
    node_type: str
    name: str
    properties: dict[str, Any] = field(default_factory=dict)
    children: list[ASTNode] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AkaBotActivity:
    """aKaBotアクティビティ"""
    activity_type: str
    display_name: str
    properties: dict[str, str] = field(default_factory=dict)
    children: list[AkaBotActivity] = field(default_factory=list)
    variables: list[dict[str, str]] = field(default_factory=list)


@dataclass
class ConversionResult:
    """Phase2 出力: 変換結果"""
    source_robot: str
    activities: list[AkaBotActivity] = field(default_factory=list)
    variables: list[dict[str, str]] = field(default_factory=list)
    xaml_content: str = ""
    project_json: str = ""
    todo_items: list[str] = field(default_factory=list)
    conversion_rate: float = 0.0
    converted_at: datetime = field(default_factory=datetime.now)


@dataclass
class ValidationIssue:
    """検証問題"""
    severity: str  # error, warning, info
    category: str  # syntax, naming, best_practice, missing
    message: str
    location: str = ""
    suggestion: str = ""


@dataclass
class ValidationReport:
    """Phase3 出力: 検証レポート"""
    robot_name: str
    issues: list[ValidationIssue] = field(default_factory=list)
    passed: bool = True
    score: float = 100.0
    validated_at: datetime = field(default_factory=datetime.now)

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "warning")


@dataclass
class TestCase:
    """テストケース定義"""
    name: str
    robot_name: str
    test_type: TestType
    input_data: dict[str, Any] = field(default_factory=dict)
    expected_output: dict[str, Any] = field(default_factory=dict)
    timeout: int = 300


@dataclass
class TestExecution:
    """テスト実行結果"""
    test_case: TestCase
    result: TestResult = TestResult.SKIPPED
    actual_output: dict[str, Any] = field(default_factory=dict)
    differences: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0
    error_message: str = ""
    executed_at: datetime = field(default_factory=datetime.now)


@dataclass
class MigrationRecord:
    """移行レコード (DB保存用)"""
    robot_name: str
    source_path: str
    status: MigrationStatus = MigrationStatus.PENDING
    difficulty_rank: DifficultyRank = DifficultyRank.A
    complexity_score: float = 0.0
    conversion_rate: float = 0.0
    validation_score: float = 0.0
    test_pass_rate: float = 0.0
    manual_items: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


# --- Phase 5: デプロイ関連 ---

class DeploymentStatus(str, enum.Enum):
    PENDING = "pending"
    PACKAGING = "packaging"
    UPLOADING = "uploading"
    CONFIGURING = "configuring"
    HEALTH_CHECK = "health_check"
    DEPLOYED = "deployed"
    PARTIAL = "partial"       # 一部端末のみ成功
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class MachineInfo:
    """デプロイ先マシン(端末)情報"""
    name: str
    machine_id: int
    ip_address: str = ""
    environment: str = "Production"   # Production / Staging / Development
    os_type: str = "Windows"
    status: str = "Available"
    agent_version: str = ""
    tags: list[str] = field(default_factory=list)


@dataclass
class DeploymentRecord:
    """デプロイ結果レコード"""
    project_name: str
    target_machines: list[str] = field(default_factory=list)
    status: DeploymentStatus = DeploymentStatus.PENDING
    package_path: str = ""
    package_id: str = ""
    process_id: str = ""
    health_results: dict[str, bool] = field(default_factory=dict)
    error_message: str = ""
    deployed_at: datetime = field(default_factory=datetime.now)
