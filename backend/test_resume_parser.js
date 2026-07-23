const fs = require('fs');
const path = require('path');
const { parseResume } = require('./services/resumeParser');

async function test() {
  const filePath = path.join(__dirname, 'sample_resume.pdf');
  const pdfBuffer = fs.readFileSync(filePath);

  console.log('Testing parseResume with real PDF file:', filePath, '\n');
  const candidate = await parseResume(pdfBuffer);
}

test().catch((err) => console.error('Test error:', err));
