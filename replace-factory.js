const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, fileList);
        } else if (filePath.endsWith('.tsx') && filePath !== path.join('src', 'app', 'factory', 'page.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = getFiles('src/app/factory');

const bgReplacement = '<div className="min-h-screen relative overflow-hidden" style={{ background: \'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)\' }}>\n            <div className="absolute inset-0 pointer-events-none overflow-hidden">\n                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: \'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)\' }} />\n                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: \'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)\' }} />\n                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\\"data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'56\' height=\'100\'%3E%3Cpath d=\'M28 66L0 50V16L28 0l28 16v34L28 66z\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'1\'/%3E%3C/svg%3E\\")", backgroundSize: \'56px 100px\' }} />\n            </div>\n            <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-8 space-y-6">';

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');

    // Add ArrowLeft import if missing
    if (!content.includes('ArrowLeft')) {
        content = content.replace(/import { (.*?) } from 'lucide-react';/, "import { ArrowLeft, $1 } from 'lucide-react';");
    }

    // Colors & Borders
    content = content.replace(/text-gray-900/g, 'text-white/90');
    content = content.replace(/text-gray-800/g, 'text-white/90');
    content = content.replace(/text-gray-700/g, 'text-white/80');
    content = content.replace(/text-gray-600/g, 'text-white/70');
    content = content.replace(/text-gray-500/g, 'text-white/60');
    content = content.replace(/text-gray-400/g, 'text-white/40');
    content = content.replace(/text-gray-300/g, 'text-white/30');
    content = content.replace(/bg-white/g, 'bg-white/5 border border-white/10 backdrop-blur-md');
    content = content.replace(/bg-gray-50/g, 'bg-white/5');
    content = content.replace(/bg-gray-100/g, 'bg-white/10');
    content = content.replace(/bg-gray-200/g, 'bg-white/20');
    content = content.replace(/border-gray-100/g, 'border-white/10');
    content = content.replace(/border-gray-200/g, 'border-white/10');
    content = content.replace(/border-gray-300/g, 'border-white/20');

    // Background replacement
    // Try to match standard wrappers like <div className="min-h-screen bg-white/5 p-6 md:p-8">
    content = content.replace(
        /<div className="min-h-screen bg-white\/5 p-6 md:p-8">\s*<div className="max-w-6xl mx-auto space-y-6">/,
        bgReplacement
    );

    content = content.replace(
        /<div className="min-h-screen bg-white\/5 p-6 md:p-8">\s*<div className="max-w-4xl mx-auto space-y-6">/,
        bgReplacement.replace('max-w-6xl', 'max-w-4xl')
    );

    // If it was bg-white originally
    content = content.replace(
        /<div className="min-h-screen bg-white\/5 border border-white\/10 backdrop-blur-md p-6 md:p-8">\s*<div className="max-w-6xl mx-auto space-y-6">/,
        bgReplacement
    );

    // Add Return button to headers
    // Usually starts with <h1 className="text-3xl font-bold
    content = content.replace(
        /<h1 className="text-3xl font-bold/g,
        '<Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Volver a Fábrica</Link>\n                        <h1 className="text-3xl font-bold'
    );
    
    // Fix specific double border class from previous bg-white replacement
    content = content.replace(/bg-white\/5 border border-white\/10 backdrop-blur-md\/5/g, 'bg-white/5');

    fs.writeFileSync(file, content, 'utf-8');
    console.log("Updated styles in " + file);
}
