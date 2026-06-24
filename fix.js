const fs = require('fs');
let text = fs.readFileSync('js/main.js', 'utf8');
text = text.replace("    }\n      : driveUrl;", "    }");
text = text.replace("    }\r\n      : driveUrl;", "    }");
text = text.replace("    }\n      : driveUrl;\n", "    }\n");
text = text.replace("    }\r\n      : driveUrl;\r\n", "    }\r\n");
fs.writeFileSync('js/main.js', text, 'utf8');
