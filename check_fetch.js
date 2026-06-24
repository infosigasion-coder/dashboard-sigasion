try {
  const content = require('fs').readFileSync('js/main.js', 'utf8');
  console.log('js/main.js length:', content.length);
  // Check fetch logic
  const fetchMatches = content.match(/fetch\([^)]+\)/g);
  if (fetchMatches) {
     console.log('Fetches found:', fetchMatches.slice(0, 5));
  }
} catch(e) {
  console.log(e);
}
