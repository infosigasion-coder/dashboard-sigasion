const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/migue/.gemini/antigravity/brain';
if (!fs.existsSync(brainDir)) {
  console.log('Brain directory does not exist');
  process.exit(0);
}

const dirs = fs.readdirSync(brainDir);
dirs.forEach(dir => {
  const logPath = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(logPath)) {
    console.log(`Searching in conversation: ${dir}`);
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      try {
        const obj = JSON.parse(line);
        if (obj.content) {
          const c = obj.content.toLowerCase();
          if ((c.includes('flash') || c.includes('gemini')) && (c.includes('funciona') || c.includes('error') || c.includes('ez-pos') || c.includes('pague') || c.includes('limite') || c.includes('rate') || c.includes('gratis') || c.includes('free'))) {
            if (obj.type === 'USER_INPUT' || obj.type === 'PLANNER_RESPONSE') {
              console.log(`[Conv: ${dir}] Step ${obj.step_index} (${obj.type}):`);
              console.log(obj.content.substring(0, 500));
              console.log('='.repeat(50));
            }
          }
        }
      } catch (e) {}
    });
  }
});
