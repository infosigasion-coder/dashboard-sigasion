const fs = require('fs');
const logPath = 'C:/Users/migue/.gemini/antigravity/brain/bcedafc7-125f-4911-9cda-32fb8d74de76/.system_generated/logs/transcript.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('gemini') || line.toLowerCase().includes('ez-pos') || line.toLowerCase().includes('flash') || line.toLowerCase().includes('pro')) {
      // Print first 500 chars of the content
      try {
        const obj = JSON.parse(line);
        if (obj.content && (obj.content.includes('Gemini') || obj.content.includes('ez-POS') || obj.content.includes('flash') || obj.content.includes('pro') || obj.content.includes('modelo'))) {
          console.log(`Step ${obj.step_index} (${obj.type}): ${obj.content.substring(0, 300)}...`);
        }
      } catch (e) {}
    }
  });
} else {
  console.log('Logs not found');
}
