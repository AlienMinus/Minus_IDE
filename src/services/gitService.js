import { executeCommand } from "./sandboxService.js";

export async function resolveEffectiveCwd(customCwd) {
  if (customCwd && (customCwd.includes(":") || customCwd.includes("/"))) {
    return customCwd;
  }
  const folderName = customCwd || "WebIDE";
  const apiBase = typeof window !== "undefined" ? "/api/sandbox" : "http://localhost:3000/api/sandbox";
  try {
    const res = await fetch(`${apiBase}/workspace/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderName })
    });
    const data = await res.json();
    if (data.success && data.path) return data.path;
  } catch {}
  return customCwd || "D:/Rough/WebIDE";
}

/**
 * Helper to execute git command in given working directory
 */
async function runGit(command, cwd) {
  const effectiveCwd = await resolveEffectiveCwd(cwd);
  return await executeCommand(command, { cwd: effectiveCwd, timeoutMs: 30000 });
}

/**
 * Check if directory is a git repository
 */
export async function checkIsGitRepo(cwd) {
  try {
    const res = await runGit("git rev-parse --is-inside-work-tree", cwd);
    return res.success && res.stdout.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Initialize a new Git repository
 */
export async function initGitRepo(cwd) {
  const res = await runGit("git init", cwd);
  if (!res.success) return res;
  try {
    await runGit("git branch -M main", cwd);
  } catch {}
  return res;
}

/**
 * Get current active branch name
 */
export async function getCurrentBranch(cwd) {
  try {
    const res = await runGit("git branch --show-current", cwd);
    if (res.success && res.stdout.trim()) {
      return res.stdout.trim();
    }
    const sym = await runGit("git symbolic-ref --short HEAD", cwd);
    if (sym.success && sym.stdout.trim()) {
      return sym.stdout.trim();
    }
  } catch {}
  return "main";
}

/**
 * Get list of all branches
 */
export async function getBranches(cwd) {
  try {
    const res = await runGit("git branch -a", cwd);
    if (!res.success) return [];
    const lines = res.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const isCurrent = line.startsWith("*");
      const name = line.replace(/^\*\s*/, "").trim();
      const isRemote = name.startsWith("remotes/");
      return { name, isCurrent, isRemote };
    });
  } catch {
    return [];
  }
}

/**
 * Switch / Checkout branch
 */
export async function checkoutBranch(cwd, branchName) {
  return await runGit(`git checkout "${branchName}"`, cwd);
}

/**
 * Create and switch to new branch
 */
export async function createBranch(cwd, branchName) {
  return await runGit(`git checkout -b "${branchName}"`, cwd);
}

/**
 * Get upstream tracking info (commits ahead / behind)
 */
export async function getTrackingInfo(cwd) {
  try {
    const upstreamRes = await runGit("git rev-parse --abbrev-ref --symbolic-full-name @{u}", cwd);
    if (!upstreamRes.success || !upstreamRes.stdout.trim()) {
      return { upstream: null, ahead: 0, behind: 0 };
    }
    const upstream = upstreamRes.stdout.trim();
    const countsRes = await runGit("git rev-list --left-right --count HEAD...@{u}", cwd);
    if (countsRes.success) {
      const parts = countsRes.stdout.trim().split(/\s+/);
      const ahead = parseInt(parts[0], 10) || 0;
      const behind = parseInt(parts[1], 10) || 0;
      return { upstream, ahead, behind };
    }
    return { upstream, ahead: 0, behind: 0 };
  } catch {
    return { upstream: null, ahead: 0, behind: 0 };
  }
}

/**
 * Get configured Git remotes
 */
export async function getRemotes(cwd) {
  try {
    const res = await runGit("git remote -v", cwd);
    if (!res.success) return [];
    const map = new Map();
    res.stdout.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const url = parts[1];
        const type = parts[2] ? parts[2].replace(/[()]/g, "") : "fetch";
        if (!map.has(name)) {
          map.set(name, { name, fetchUrl: url, pushUrl: url });
        } else {
          const existing = map.get(name);
          if (type === "push") existing.pushUrl = url;
          else existing.fetchUrl = url;
        }
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

/**
 * Add a remote repository
 */
export async function addRemote(cwd, name, url) {
  return await runGit(`git remote add ${name} "${url}"`, cwd);
}

/**
 * Get complete Git status (staged and unstaged changes)
 */
export async function getGitStatus(cwd) {
  try {
    const res = await runGit("git status --porcelain=v1 -u", cwd);
    if (!res.success) {
      return { isRepo: false, staged: [], unstaged: [] };
    }

    const lines = res.stdout.split("\n").filter((l) => l.length >= 2);
    const staged = [];
    const unstaged = [];

    for (const line of lines) {
      const x = line[0];
      const y = line[1];
      let filePath = line.substring(3).trim();
      if (filePath.startsWith('"') && filePath.endsWith('"')) {
        filePath = filePath.slice(1, -1);
      }

      const fileName = filePath.split("/").pop().split("\\").pop();

      if (x === "?" && y === "?") {
        unstaged.push({
          path: filePath,
          fileName,
          status: "Untracked",
          code: "U",
          staged: false
        });
      } else {
        if (x !== " " && x !== "?") {
          const codeMap = { M: "Modified", A: "Added", D: "Deleted", R: "Renamed", C: "Copied" };
          staged.push({
            path: filePath,
            fileName,
            status: codeMap[x] || "Staged",
            code: x,
            staged: true
          });
        }
        if (y !== " " && y !== "?") {
          const codeMap = { M: "Modified", D: "Deleted" };
          unstaged.push({
            path: filePath,
            fileName,
            status: codeMap[y] || "Modified",
            code: y,
            staged: false
          });
        }
      }
    }

    return { isRepo: true, staged, unstaged };
  } catch {
    return { isRepo: false, staged: [], unstaged: [] };
  }
}

/**
 * Stage a specific file
 */
export async function stageFile(cwd, filePath) {
  return await runGit(`git add -- "${filePath}"`, cwd);
}

/**
 * Unstage a specific file
 */
export async function unstageFile(cwd, filePath) {
  return await runGit(`git restore --staged -- "${filePath}"`, cwd);
}

/**
 * Stage all modified/untracked files
 */
export async function stageAll(cwd) {
  return await runGit("git add -A", cwd);
}

/**
 * Unstage all staged files
 */
export async function unstageAll(cwd) {
  return await runGit("git restore --staged .", cwd);
}

/**
 * Discard changes for a file
 */
export async function discardFile(cwd, filePath, isUntracked = false) {
  if (isUntracked) {
    return await runGit(`git clean -fd -- "${filePath}"`, cwd);
  }
  return await runGit(`git restore -- "${filePath}"`, cwd);
}

/**
 * Discard all unstaged changes and untracked files
 */
export async function discardAll(cwd) {
  await runGit("git restore .", cwd);
  return await runGit("git clean -fd", cwd);
}

/**
 * Commit changes
 */
export async function commitChanges(cwd, message, { amend = false, all = false } = {}) {
  const sanitized = message.replace(/"/g, '\\"');
  if (all) {
    return await runGit(`git add -A && git commit -m "${sanitized}"`, cwd);
  }
  if (amend) {
    return await runGit(`git commit --amend -m "${sanitized}"`, cwd);
  }
  return await runGit(`git commit -m "${sanitized}"`, cwd);
}

/**
 * Push to remote
 */
export async function gitPush(cwd, { remote = "origin", branch = "", setUpstream = false } = {}) {
  if (setUpstream && branch) {
    return await runGit(`git push -u ${remote} ${branch}`, cwd);
  }
  if (branch) {
    return await runGit(`git push ${remote} ${branch}`, cwd);
  }
  return await runGit("git push", cwd);
}

/**
 * Pull from remote
 */
export async function gitPull(cwd) {
  return await runGit("git pull", cwd);
}

/**
 * Fetch from remote
 */
export async function gitFetch(cwd) {
  return await runGit("git fetch", cwd);
}

/**
 * Sync (Pull & Push)
 */
export async function gitSync(cwd) {
  const pullRes = await gitPull(cwd);
  if (!pullRes.success) return pullRes;
  return await gitPush(cwd);
}

/**
 * Publish repository to GitHub
 */
export async function publishToGitHub(cwd, repoUrl, branch = "main") {
  const remotes = await getRemotes(cwd);
  const hasOrigin = remotes.some((r) => r.name === "origin");
  if (!hasOrigin) {
    const addRes = await addRemote(cwd, "origin", repoUrl);
    if (!addRes.success) return addRes;
  } else {
    await runGit(`git remote set-url origin "${repoUrl}"`, cwd);
  }
  return await runGit(`git push -u origin ${branch}`, cwd);
}

/**
 * Stash changes
 */
export async function gitStash(cwd) {
  return await runGit("git stash", cwd);
}

/**
 * Pop stashed changes
 */
export async function gitStashPop(cwd) {
  return await runGit("git stash pop", cwd);
}

/**
 * Get commit log / history
 */
export async function getGitLog(cwd, limit = 15) {
  try {
    const res = await runGit(
      `git log -n ${limit} --pretty=format:"%h%x09%an%x09%ad%x09%s" --date=relative`,
      cwd
    );
    if (!res.success) return [];
    return res.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const clean = line.replace(/^"/, "").replace(/"$/, "");
        const parts = clean.split("\t");
        return {
          hash: (parts[0] || "").replace(/^"/, "").trim(),
          author: (parts[1] || "").trim(),
          date: (parts[2] || "").trim(),
          subject: (parts.slice(3).join("\t") || "").replace(/"$/, "").trim()
        };
      });
  } catch {
    return [];
  }
}
