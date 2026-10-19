import * as fs from 'fs';
import * as path from 'path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';

/**
 * Compact, human-friendly JSON report (reports/json/summary.json).
 * Complements Playwright's full built-in JSON report (reports/json/results.json)
 * with a flat shape that dashboards, Slack bots or n8n flows can consume directly.
 */
interface StepEntry {
  title: string;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
}

interface TestEntry {
  id: string;
  title: string;
  file: string;
  project: string;
  tags: string[];
  status: TestResult['status'];
  outcome: ReturnType<TestCase['outcome']>;
  retries: number;
  durationMs: number;
  startedAt: string;
  steps: StepEntry[];
  error?: string;
  attachments: { name: string; contentType: string; path?: string; data?: unknown }[];
}

const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

class SummaryJsonReporter implements Reporter {
  private readonly outputFile: string;
  private readonly tests = new Map<string, TestEntry>();
  private startedAt = new Date();
  private config?: FullConfig;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? 'reports/json/summary.json';
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.startedAt = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const steps: StepEntry[] = result.steps
      .filter((s: TestStep) => s.category === 'test.step')
      .map((s: TestStep) => ({
        title: s.title,
        status: s.error ? 'failed' : 'passed',
        durationMs: s.duration,
        ...(s.error ? { error: stripAnsi(s.error.message ?? '').split('\n')[0] } : {}),
      }));

    const attachments = result.attachments.map((a) => {
      const entry: TestEntry['attachments'][number] = { name: a.name, contentType: a.contentType };
      if (a.path) entry.path = path.relative(process.cwd(), a.path);
      if (a.body && a.contentType === 'application/json') {
        try {
          entry.data = JSON.parse(a.body.toString('utf8'));
        } catch {
          /* leave as-is */
        }
      }
      return entry;
    });

    // Later retries overwrite earlier attempts so the summary shows the final result.
    this.tests.set(test.id, {
      id: test.id,
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      project: test.parent.project()?.name ?? 'default',
      tags: test.tags,
      status: result.status,
      outcome: test.outcome(),
      retries: result.retry,
      durationMs: result.duration,
      startedAt: result.startTime.toISOString(),
      steps,
      ...(result.error ? { error: stripAnsi(result.error.message ?? '') } : {}),
      attachments,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const tests = [...this.tests.values()];
    const count = (o: string) => tests.filter((t) => t.outcome === o).length;

    const summary = {
      suite: 'carvana-playwright-framework',
      status: result.status,
      startedAt: this.startedAt.toISOString(),
      durationMs: Math.round(result.duration),
      baseUrl: this.config?.projects[0]?.use?.baseURL ?? null,
      environment: {
        node: process.version,
        platform: process.platform,
        ci: Boolean(process.env.CI),
        playwright: this.config?.version,
      },
      totals: {
        total: tests.length,
        passed: count('expected'),
        failed: count('unexpected'),
        flaky: count('flaky'),
        skipped: count('skipped'),
      },
      tests,
    };

    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, JSON.stringify(summary, null, 2));
    console.log(`\nJSON summary written to ${this.outputFile}`);
  }

  printsToStdio(): boolean {
    return false;
  }
}

export default SummaryJsonReporter;
