// Scriptable: bounded anti-click-farm test tool
// Opens a fixed, small number of Safari tabs against a URL you supply,
// logging each attempt for later review. Iteration count is hardcoded
// intentionally so this cannot be turned into an unbounded loop.

const MAX_ITERATIONS = 10;      // fixed cap — do not parameterize
const DELAY_SECONDS = 3;        // pause between opens, avoids self-DoS

const LOG_FILE_NAME = "click-farm-test-log.txt";

function sleep(seconds) {
    return new Promise(resolve => Timer.schedule(seconds * 1000, false, resolve));
}

function nowISO() {
    return new Date().toISOString();
}

async function appendLog(fm, logPath, line) {
    const entry = `[${nowISO()}] ${line}`;
    console.log(entry);
    let existing = "";
    if (fm.fileExists(logPath)) {
        existing = fm.readString(logPath);
    }
    fm.writeString(logPath, existing + entry + "\n");
}

async function run() {
    // Resolve URL: shortcut parameter takes priority, otherwise prompt.
    let targetURL = null;
    if (args.shortcutParameter && String(args.shortcutParameter).length > 0) {
        targetURL = String(args.shortcutParameter);
    } else {
        const alert = new Alert();
        alert.title = "Anti-Click-Farm Test";
        alert.message = `Enter the URL to test (max ${MAX_ITERATIONS} opens).`;
        alert.addTextField("https://yourdomain.com/page", "");
        alert.addAction("Start");
        alert.addCancelAction("Cancel");
        const choice = await alert.presentAlert();
        if (choice === -1) {
            console.log("Cancelled by user.");
            Script.complete();
            return;
        }
        targetURL = alert.textFieldValue(0);
    }

    if (!targetURL || targetURL.trim().length === 0) {
        console.log("No URL provided, aborting.");
        Script.complete();
        return;
    }

    targetURL = targetURL.trim();
    if (!/^https?:\/\/.+/i.test(targetURL)) {
        console.log(`Refusing non-http(s) URL: ${targetURL}`);
        Script.complete();
        return;
    }

    const fm = FileManager.local();
    const logPath = fm.joinPath(fm.documentsDirectory(), LOG_FILE_NAME);

    await appendLog(fm, logPath, `=== Test run started: target=${targetURL}, iterations=${MAX_ITERATIONS} ===`);

    for (let i = 1; i <= MAX_ITERATIONS; i++) {
        try {
            await appendLog(fm, logPath, `Iteration ${i}/${MAX_ITERATIONS}: opening Safari for ${targetURL}`);
            const opened = await Safari.open(targetURL);
            await appendLog(fm, logPath, `Iteration ${i}/${MAX_ITERATIONS}: Safari.open returned ${opened}`);
        } catch (e) {
            await appendLog(fm, logPath, `Iteration ${i}/${MAX_ITERATIONS}: ERROR ${e}`);
        }

        if (i < MAX_ITERATIONS) {
            await sleep(DELAY_SECONDS);
        }
    }

    await appendLog(fm, logPath, `=== Test run complete. Log saved to ${logPath} ===`);
    Script.complete();
}

await run();
