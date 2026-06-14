const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, fileList);
        } else if (filePath.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const targetFiles = getFiles('src/app/inventory');

const bgReplacement = `<div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")\`, backgroundSize: '56px 100px' }} />
            </div>`;

for (const filePath of targetFiles) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Replace old glow
    content = content.replace(
        /<div className="min-h-screen bg-slate-950 relative overflow-hidden(?:.*?)">\s*<div className="absolute top-\[-10%\] left-\[-10%\] w-\[40%\] h-\[40%\] rounded-full bg-rose-600\/20 blur-\[120px\] pointer-events-none" \/>\s*<div className="absolute bottom-\[-10%\] right-\[-10%\] w-\[40%\] h-\[40%\] rounded-full bg-purple-600\/20 blur-\[120px\] pointer-events-none" \/>/g,
        bgReplacement
    );

    // Also replace the bg-white/5 top level wrappers that might still be there for loaders
    content = content.replace(/<div className="flex items-center justify-center min-h-screen bg-white\/5">/g, '<div className="flex items-center justify-center min-h-screen relative overflow-hidden" style={{ background: \'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)\' }}>');
    content = content.replace(/<div className="flex flex-col items-center justify-center min-h-screen bg-white\/5 text-white\/60">/g, '<div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden text-white/60" style={{ background: \'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)\' }}>');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated BG in ${filePath}`);
    }
}
