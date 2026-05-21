import { execFile } from 'node:child_process';
import { OUTPUT_LIMIT, requireString, truncateText } from '../../../Utils/WorkspaceUtils.js';

const GIT_ERROR_CATEGORY = Object.freeze({
  AUTH: 'auth',
  NO_UPSTREAM: 'no_upstream',
  DIVERGED: 'diverged',
  CONFLICT: 'conflict',
  NOTHING: 'nothing',
  NOT_REPO: 'not_repo',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
});

function normalizeBool(value) {
  return value === true || value === 'true';
}

function normalizeGitError(stderr = '', stdout = '') {
  const text = `${stderr}\n${stdout}`.toLowerCase();
  if (/nothing to commit|nothing added to commit|no changes added/.test(text)) {
    return {
      category: GIT_ERROR_CATEGORY.NOTHING,
      hint: 'Nothing to commit. The working tree is clean.',
    };
  }
  if (/already up.to.date/.test(text)) {
    return { category: GIT_ERROR_CATEGORY.NOTHING, hint: 'Already up to date.' };
  }
  if (
    /authentication failed|could not read username|permission denied|invalid credentials|http 401|http 403/.test(
      text,
    )
  ) {
    return {
      category: GIT_ERROR_CATEGORY.AUTH,
      hint: 'Authentication failed. Re-enter credentials or check SSH/token access.',
    };
  }
  if (/no upstream|set.upstream|has no tracked branch|does not track/.test(text)) {
    return {
      category: GIT_ERROR_CATEGORY.NO_UPSTREAM,
      hint: 'The current branch has no upstream. Push with upstream tracking.',
    };
  }
  if (/non-fast-forward|fetch first|tip of your current branch is behind/.test(text)) {
    return {
      category: GIT_ERROR_CATEGORY.DIVERGED,
      hint: 'The remote has commits that are not present locally.',
    };
  }
  if (/conflict|automatic merge failed|merge conflict/.test(text)) {
    return {
      category: GIT_ERROR_CATEGORY.CONFLICT,
      hint: 'A merge conflict was detected.',
    };
  }
  if (/not a git repository/.test(text)) {
    return {
      category: GIT_ERROR_CATEGORY.NOT_REPO,
      hint: 'This folder is not a Git repository.',
    };
  }
  if (/unable to connect|could not resolve host|timed out|ssl|connection refused/.test(text)) {
    return {
      category: GIT_ERROR_CATEGORY.NETWORK,
      hint: 'Network error. Check the connection and remote URL.',
    };
  }
  return {
    category: GIT_ERROR_CATEGORY.UNKNOWN,
    hint: String(stderr || stdout || 'Unknown Git error.').trim(),
  };
}

function runGitArgs(args, workingDir, opts = {}) {
  const timeout = opts.timeout ?? 60_000;
  return new Promise((resolve) => {
    execFile(
      'git',
      args.filter(Boolean),
      { cwd: workingDir, timeout, maxBuffer: OUTPUT_LIMIT },
      (error, stdout, stderr) => {
        const exitCode = typeof error?.code === 'number' ? error.code : 0;
        if (!error) {
          resolve({
            ok: true,
            stdout: truncateText(stdout),
            stderr: truncateText(stderr),
            exitCode,
          });
          return;
        }

        const { category, hint } = normalizeGitError(stderr, stdout);
        resolve({
          ok: false,
          stdout: truncateText(stdout),
          stderr: truncateText(stderr),
          exitCode,
          category,
          hint,
          error: hint,
        });
      },
    );
  });
}

function requireGitMutationOptIn(payload = {}, action = 'This Git operation') {
  return normalizeBool(payload.allowRisky ?? payload.allow_risky)
    ? null
    : { ok: false, error: `${action} requires allow_risky=true.` };
}

function requireGitWorkingDir(payload = {}) {
  return requireString(payload.workingDir, 'No working directory provided.');
}

export function createGitService() {
  async function gitStatus(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    return runGitArgs(['status', '--short', '--branch'], payload.workingDir, { timeout: 20_000 });
  }

  async function gitDiff(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    return runGitArgs(
      ['diff', payload.staged ? '--cached' : '', '--stat', '--patch', '--minimal', '--color=never'],
      payload.workingDir,
      { timeout: 30_000 },
    );
  }

  async function gitBranches(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const [current, branches] = await Promise.all([
      runGitArgs(['rev-parse', '--abbrev-ref', 'HEAD'], payload.workingDir, { timeout: 20_000 }),
      runGitArgs(['branch', '--format=%(refname:short)'], payload.workingDir, { timeout: 20_000 }),
    ]);
    if (!current.ok && !branches.ok) {
      return {
        ok: false,
        category: GIT_ERROR_CATEGORY.NOT_REPO,
        error: 'This folder is not a Git repository.',
      };
    }
    return {
      ok: true,
      current: current.stdout.trim(),
      branches: branches.stdout
        .split('\n')
        .map((branch) => branch.trim())
        .filter(Boolean),
    };
  }

  async function gitCreateBranch(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Creating a Git branch');
    if (optInError) return optInError;
    const branchError = requireString(payload.branch, 'No branch name provided.');
    if (branchError) return branchError;
    return runGitArgs(['checkout', '-b', String(payload.branch).trim()], payload.workingDir, {
      timeout: 60_000,
    });
  }

  async function gitCheckoutBranch(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Checking out a Git branch');
    if (optInError) return optInError;
    const branchError = requireString(payload.branch, 'No branch name provided.');
    if (branchError) return branchError;
    return runGitArgs(['checkout', String(payload.branch).trim()], payload.workingDir, {
      timeout: 60_000,
    });
  }

  async function gitDeleteBranch(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Deleting a Git branch');
    if (optInError) return optInError;
    const branchError = requireString(payload.branch, 'No branch name provided.');
    if (branchError) return branchError;
    return runGitArgs(['branch', '-D', String(payload.branch).trim()], payload.workingDir, {
      timeout: 60_000,
    });
  }

  async function gitPull(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Pulling from a Git remote');
    if (optInError) return optInError;
    const result = await runGitArgs(['pull', '--no-rebase'], payload.workingDir, {
      timeout: 60_000,
    });
    return !result.ok && result.category === GIT_ERROR_CATEGORY.NOTHING
      ? { ...result, ok: true }
      : result;
  }

  async function gitCommit(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Creating a Git commit');
    if (optInError) return optInError;
    const messageError = requireString(payload.message, 'No commit message provided.');
    if (messageError) return messageError;

    const status = await runGitArgs(['status', '--porcelain'], payload.workingDir, {
      timeout: 20_000,
    });
    if (!status.ok) return status;
    if (!status.stdout.trim()) {
      return {
        ok: true,
        noop: true,
        category: GIT_ERROR_CATEGORY.NOTHING,
        hint: 'Nothing to commit. The working tree is clean.',
      };
    }

    const add = await runGitArgs(['add', '-A'], payload.workingDir, { timeout: 60_000 });
    if (!add.ok) return add;

    const commit = await runGitArgs(
      ['commit', '-m', String(payload.message).trim()],
      payload.workingDir,
      { timeout: 300_000 },
    );
    return !commit.ok && commit.category === GIT_ERROR_CATEGORY.NOTHING
      ? { ...commit, ok: true, noop: true }
      : commit;
  }

  async function gitPush(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Pushing to a Git remote');
    if (optInError) return optInError;

    let result = await runGitArgs(['push'], payload.workingDir, { timeout: 60_000 });
    if (result.ok) return result;
    if (result.category === GIT_ERROR_CATEGORY.NO_UPSTREAM) {
      return runGitArgs(['push', '-u', 'origin', 'HEAD'], payload.workingDir, { timeout: 60_000 });
    }
    if (result.category !== GIT_ERROR_CATEGORY.DIVERGED) return result;

    await runGitArgs(['rebase', '--abort'], payload.workingDir, { timeout: 20_000 }).catch(
      () => {},
    );
    const pull = await runGitArgs(['pull', '--no-rebase'], payload.workingDir, { timeout: 60_000 });
    if (!pull.ok && pull.category !== GIT_ERROR_CATEGORY.NOTHING) return pull;
    result = await runGitArgs(['push'], payload.workingDir, { timeout: 60_000 });
    return !result.ok && result.category === GIT_ERROR_CATEGORY.NO_UPSTREAM
      ? runGitArgs(['push', '-u', 'origin', 'HEAD'], payload.workingDir, { timeout: 60_000 })
      : result;
  }

  async function gitPushSync(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const optInError = requireGitMutationOptIn(payload, 'Pulling and pushing Git changes');
    if (optInError) return optInError;

    await runGitArgs(['rebase', '--abort'], payload.workingDir, { timeout: 20_000 }).catch(
      () => {},
    );
    const pull = await runGitArgs(['pull', '--no-rebase'], payload.workingDir, { timeout: 60_000 });
    if (
      !pull.ok &&
      pull.category !== GIT_ERROR_CATEGORY.NOTHING &&
      pull.category !== GIT_ERROR_CATEGORY.NO_UPSTREAM
    ) {
      return pull;
    }

    let result = await runGitArgs(['push'], payload.workingDir, { timeout: 60_000 });
    if (result.ok) return result;
    return result.category === GIT_ERROR_CATEGORY.NO_UPSTREAM
      ? runGitArgs(['push', '-u', 'origin', 'HEAD'], payload.workingDir, { timeout: 60_000 })
      : result;
  }

  async function gitLog(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const limit = Math.min(Math.max(Number(payload.limit) || 20, 1), 100);
    return runGitArgs(
      ['log', `--max-count=${limit}`, '--oneline', '--decorate', '--graph'],
      payload.workingDir,
      { timeout: 20_000 },
    );
  }

  async function gitTags(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    return runGitArgs(['tag', '-l', '--sort=-version:refname'], payload.workingDir, {
      timeout: 20_000,
    });
  }

  async function gitStash(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const action = String(payload.action ?? 'list')
      .trim()
      .toLowerCase();
    if (action === 'list') {
      return runGitArgs(['stash', 'list'], payload.workingDir, { timeout: 20_000 });
    }
    const optInError = requireGitMutationOptIn(payload, 'Git stash mutation');
    if (optInError) return optInError;
    if (action === 'push') {
      const args = ['stash', 'push'];
      if (payload.message) args.push('-m', String(payload.message).trim());
      return runGitArgs(args, payload.workingDir, { timeout: 30_000 });
    }
    if (action === 'pop') {
      return runGitArgs(['stash', 'pop'], payload.workingDir, { timeout: 30_000 });
    }
    if (action === 'drop') {
      return runGitArgs(['stash', 'drop'], payload.workingDir, { timeout: 20_000 });
    }
    return { ok: false, error: `Unknown stash action: ${action}. Use list, push, pop, or drop.` };
  }

  async function gitRemote(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    return runGitArgs(['remote', '-v'], payload.workingDir, { timeout: 20_000 });
  }

  async function gitShow(payload = {}) {
    const directoryError = requireGitWorkingDir(payload);
    if (directoryError) return directoryError;
    const ref = String(payload.ref ?? payload.hash ?? payload.commit ?? 'HEAD').trim();
    return runGitArgs(['show', '--stat', '--patch', '--color=never', ref], payload.workingDir, {
      timeout: 20_000,
    });
  }

  return {
    gitStatus,
    gitDiff,
    gitBranches,
    gitCreateBranch,
    gitCheckoutBranch,
    gitDeleteBranch,
    gitPull,
    gitCommit,
    gitPush,
    gitPushSync,
    gitLog,
    gitTags,
    gitStash,
    gitRemote,
    gitShow,
  };
}
