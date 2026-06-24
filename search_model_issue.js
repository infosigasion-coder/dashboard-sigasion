const fs = require('fs');
const logPath = 'C:/Users/migue/.gemini/antigravity/brain/bcedafc7-125f-4911-9cda-32fb8d74de76/.system_generated/logs/transcript.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    try {
      const obj = JSON.parse(line);
      if (obj.content) {
        const c = obj.content.toLowerCase();
        if (c.includes('flash') || c.includes('pro') || c.includes('inconveniente') || c.includes('pagar') || c.includes('costo') || c.includes('modelo') || c.includes('anthropic') || c.includes('claude')) {
          // Check if this is a USER_INPUT or PLANNER_RESPONSE
          if (obj.type === 'USER_INPUT' || obj.type === 'PLANNER_RESPONSE') {
            console.log(`Step ${obj.step_index} (${obj.type}):`);
            console.log(obj.content.substring(0, 800));
            console.log('-'.repeat(50));
          }
        }
      }
    } catch (e) {}
  });
} else {
  console.log('Logs not found');
}
