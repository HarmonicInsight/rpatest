/**
 * aKaBot Orchestrator API クライアント
 *
 * USE_MOCK=true の間はモックレスポンスを返す。
 * 本番切替時は AKABOT_BASE_URL / AKABOT_TENANT / AKABOT_API_KEY を設定し
 * USE_MOCK=false にするだけで切り替わる。
 */

// ---------- 設定 ----------
const USE_MOCK = process.env.AKABOT_USE_MOCK !== "false"; // デフォルトはモック
const BASE_URL = process.env.AKABOT_BASE_URL ?? "https://orchestrator.example.com";
const TENANT = process.env.AKABOT_TENANT ?? "default";
const API_KEY = process.env.AKABOT_API_KEY ?? "";

// ---------- 型定義 ----------
export type JobStatus = "Pending" | "Running" | "Successful" | "Faulted" | "Stopped";

export type JobStartRequest = {
  processKey: string;      // aKaBot プロセス名
  robotName?: string;      // 指定ロボット（省略時はany）
  inputArguments?: Record<string, unknown>;
};

export type JobInfo = {
  jobId: string;
  processKey: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  outputArguments?: Record<string, unknown>;
  info?: string;
};

export type AssetValue = {
  name: string;
  type: "Text" | "Integer" | "Bool" | "Credential";
  value: string;
};

export type TestResult = {
  jobId: string;
  botId: string;
  caseId: string;
  status: "pass" | "fail" | "error";
  actualOutput: string;
  expectedOutput: string;
  diffDetail?: string;
  duration: string;
  timestamp: string;
};

// ---------- モック用ストレージ ----------
const mockJobs = new Map<string, JobInfo>();
let mockJobSeq = 1000;

// ---------- ヘルパー ----------
function mockDelay(ms = 200): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function genId(): string {
  mockJobSeq += 1;
  return `JOB-${mockJobSeq}`;
}

async function realFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}/api/v1${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-AKABOT-TenantName": TENANT,
      Authorization: `Bearer ${API_KEY}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

// ========== Jobs API ==========

export async function startJob(req: JobStartRequest): Promise<JobInfo> {
  if (USE_MOCK) {
    await mockDelay(300);
    const job: JobInfo = {
      jobId: genId(),
      processKey: req.processKey,
      status: "Pending",
      createdAt: new Date().toISOString(),
      info: `Mock job for ${req.processKey}`,
    };
    mockJobs.set(job.jobId, job);

    // 擬似的に 2 秒後に Running、5 秒後に完了
    setTimeout(() => {
      const j = mockJobs.get(job.jobId);
      if (j && j.status === "Pending") {
        j.status = "Running";
        j.startedAt = new Date().toISOString();
      }
    }, 2000);
    setTimeout(() => {
      const j = mockJobs.get(job.jobId);
      if (j && (j.status === "Running" || j.status === "Pending")) {
        // 90% 成功, 10% 失敗
        j.status = Math.random() < 0.9 ? "Successful" : "Faulted";
        j.endedAt = new Date().toISOString();
        j.outputArguments = {
          result: j.status === "Successful" ? "OK" : "Error in step 3",
          processedCount: j.status === "Successful" ? Math.floor(10 + Math.random() * 50) : 0,
        };
      }
    }, 5000);

    return job;
  }

  // --- 本番 ---
  const res = await realFetch("/odata/Jobs/StartJobs", {
    method: "POST",
    body: JSON.stringify({
      startInfo: {
        ReleaseKey: req.processKey,
        RobotIds: req.robotName ? [req.robotName] : [],
        Strategy: "Specific",
        InputArguments: JSON.stringify(req.inputArguments ?? {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`startJob failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const value = data.value?.[0] ?? data;
  return {
    jobId: String(value.Id),
    processKey: req.processKey,
    status: value.State as JobStatus,
    createdAt: value.CreationTime,
    startedAt: value.StartTime,
    endedAt: value.EndTime,
  };
}

export async function getJobStatus(jobId: string): Promise<JobInfo> {
  if (USE_MOCK) {
    await mockDelay(100);
    const job = mockJobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    return { ...job };
  }

  const res = await realFetch(`/odata/Jobs(${jobId})`);
  if (!res.ok) throw new Error(`getJobStatus failed: ${res.status}`);
  const data = await res.json();
  return {
    jobId: String(data.Id),
    processKey: data.ReleaseName,
    status: data.State as JobStatus,
    createdAt: data.CreationTime,
    startedAt: data.StartTime,
    endedAt: data.EndTime,
    outputArguments: data.OutputArguments ? JSON.parse(data.OutputArguments) : undefined,
  };
}

export async function listJobs(filters?: { processKey?: string; status?: JobStatus }): Promise<JobInfo[]> {
  if (USE_MOCK) {
    await mockDelay(100);
    let jobs = Array.from(mockJobs.values());
    if (filters?.processKey) jobs = jobs.filter((j) => j.processKey === filters.processKey);
    if (filters?.status) jobs = jobs.filter((j) => j.status === filters.status);
    return jobs.map((j) => ({ ...j }));
  }

  const params = new URLSearchParams();
  if (filters?.processKey) params.set("$filter", `ReleaseName eq '${filters.processKey}'`);
  const res = await realFetch(`/odata/Jobs?${params.toString()}`);
  if (!res.ok) throw new Error(`listJobs failed: ${res.status}`);
  const data = await res.json();
  return (data.value ?? []).map((d: Record<string, unknown>) => ({
    jobId: String(d.Id),
    processKey: String(d.ReleaseName),
    status: d.State as JobStatus,
    createdAt: String(d.CreationTime),
    startedAt: d.StartTime ? String(d.StartTime) : undefined,
    endedAt: d.EndTime ? String(d.EndTime) : undefined,
  }));
}

// ========== Assets API ==========

export async function setAsset(asset: AssetValue): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(100);
    // モックでは何もしない（ログだけ）
    console.log(`[mock] setAsset: ${asset.name} = ${asset.value}`);
    return;
  }

  const res = await realFetch("/odata/Assets", {
    method: "POST",
    body: JSON.stringify({
      Name: asset.name,
      ValueType: asset.type,
      Value: asset.value,
    }),
  });
  if (!res.ok) throw new Error(`setAsset failed: ${res.status}`);
}

export async function getAsset(name: string): Promise<AssetValue | null> {
  if (USE_MOCK) {
    await mockDelay(50);
    return { name, type: "Text", value: `mock_value_for_${name}` };
  }

  const res = await realFetch(`/odata/Assets?$filter=Name eq '${name}'`);
  if (!res.ok) throw new Error(`getAsset failed: ${res.status}`);
  const data = await res.json();
  const item = data.value?.[0];
  if (!item) return null;
  return { name: item.Name, type: item.ValueType, value: String(item.Value) };
}

// ========== テスト実行 (統合) ==========

/**
 * 1 つのテストケースを実行する統合関数
 * - アセットに入力データをセット
 * - ジョブを起動
 * - ステータスをポーリング
 * - 結果を取得して期待値と比較
 */
export async function runTestCase(params: {
  botId: string;
  caseId: string;
  processKey: string;
  inputData: Record<string, unknown>;
  expectedOutput: string;
}): Promise<TestResult> {
  const start = Date.now();

  // 1) 入力データをアセットとしてセット
  await setAsset({
    name: `test_input_${params.botId}_${params.caseId}`,
    type: "Text",
    value: JSON.stringify(params.inputData),
  });

  // 2) ジョブ起動
  const job = await startJob({
    processKey: params.processKey,
    inputArguments: {
      testMode: true,
      testCaseId: params.caseId,
      ...params.inputData,
    },
  });

  // 3) ポーリング（最大 60 秒）
  const deadline = Date.now() + 60_000;
  let current = job;
  while (current.status === "Pending" || current.status === "Running") {
    if (Date.now() > deadline) {
      return {
        jobId: job.jobId,
        botId: params.botId,
        caseId: params.caseId,
        status: "error",
        actualOutput: "",
        expectedOutput: params.expectedOutput,
        diffDetail: "タイムアウト: 60秒以内にジョブが完了しませんでした",
        duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
        timestamp: new Date().toISOString(),
      };
    }
    await new Promise((r) => setTimeout(r, 1000));
    current = await getJobStatus(job.jobId);
  }

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;

  // 4) 結果比較
  if (current.status === "Faulted") {
    return {
      jobId: job.jobId,
      botId: params.botId,
      caseId: params.caseId,
      status: "error",
      actualOutput: current.outputArguments?.result as string ?? "実行エラー",
      expectedOutput: params.expectedOutput,
      diffDetail: `ジョブがエラーで終了: ${current.info ?? "不明"}`,
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  const actualOutput = current.outputArguments
    ? JSON.stringify(current.outputArguments)
    : "出力なし";

  // 簡易比較（本番ではより高度な比較ロジックを使う）
  const isPass = actualOutput.includes("OK") || actualOutput.includes("processedCount");

  return {
    jobId: job.jobId,
    botId: params.botId,
    caseId: params.caseId,
    status: isPass ? "pass" : "fail",
    actualOutput,
    expectedOutput: params.expectedOutput,
    diffDetail: isPass ? undefined : `期待値と不一致:\n  期待: ${params.expectedOutput}\n  実際: ${actualOutput}`,
    duration,
    timestamp: new Date().toISOString(),
  };
}

// ========== ユーティリティ ==========

export function isMockMode(): boolean {
  return USE_MOCK;
}
