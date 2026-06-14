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

const globalWrapperRegex = /<div className="min-h-screen bg-gray-50(.*?)"(?:>)*/g;
const globalWrapperReplacement = `<div className="min-h-screen bg-slate-950 relative overflow-hidden$1">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-rose-600/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />`;

for (const filePath of targetFiles) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // 1. Global Wrapper First!
    content = content.replace(globalWrapperRegex, globalWrapperReplacement);

    // 2. Text colors
    content = content.replace(/text-gray-900/g, 'text-white/90');
    content = content.replace(/text-gray-800/g, 'text-white/80');
    content = content.replace(/text-gray-700/g, 'text-white/80');
    content = content.replace(/text-gray-600/g, 'text-white/70');
    content = content.replace(/text-gray-500/g, 'text-white/60');
    content = content.replace(/text-gray-400/g, 'text-white/40');
    content = content.replace(/text-gray-300/g, 'text-white/30');

    // 3. Borders and Backgrounds
    content = content.replace(/bg-white rounded-2xl shadow-sm border border-gray-100/g, 'bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10');
    content = content.replace(/bg-white rounded-xl shadow-sm border border-gray-100/g, 'bg-white/5 backdrop-blur-md rounded-xl shadow-sm border border-white/10');
    content = content.replace(/bg-white border border-gray-200/g, 'bg-white/5 border border-white/10');
    content = content.replace(/border border-gray-200/g, 'border border-white/20');
    content = content.replace(/border-gray-200/g, 'border-white/20');
    content = content.replace(/border-gray-100/g, 'border-white/10');
    content = content.replace(/border-gray-50/g, 'border-white/5');
    
    // IMPORTANT: Word boundary to prevent bg-white/5 becoming bg-white/5/5
    content = content.replace(/\bbg-gray-50\b/g, 'bg-white/5');
    content = content.replace(/\bbg-white\b/g, 'bg-white/5');
    content = content.replace(/hover:bg-gray-50/g, 'hover:bg-white/10');

    // Stats Backgrounds (Stock OK, etc)
    content = content.replace(/bg-green-50\/50/g, 'bg-green-500/10');
    content = content.replace(/\bbg-green-50\b/g, 'bg-green-500/10');
    content = content.replace(/text-green-700/g, 'text-green-400');
    content = content.replace(/text-green-600/g, 'text-green-400');
    content = content.replace(/text-green-800/g, 'text-green-300');
    
    content = content.replace(/bg-yellow-50\/50/g, 'bg-yellow-500/10');
    content = content.replace(/\bbg-yellow-50\b/g, 'bg-yellow-500/10');
    content = content.replace(/text-yellow-700/g, 'text-yellow-400');
    content = content.replace(/text-yellow-800/g, 'text-yellow-300');
    content = content.replace(/text-yellow-600/g, 'text-yellow-400');

    content = content.replace(/bg-red-50\/50/g, 'bg-red-500/10');
    content = content.replace(/\bbg-red-50\b/g, 'bg-red-500/10');
    content = content.replace(/text-red-700/g, 'text-red-400');
    content = content.replace(/text-red-600/g, 'text-red-400');
    content = content.replace(/text-red-800/g, 'text-red-300');

    content = content.replace(/\bbg-blue-50\b/g, 'bg-blue-500/10');
    content = content.replace(/bg-blue-100/g, 'bg-blue-500/20');
    content = content.replace(/text-blue-700/g, 'text-blue-400');
    content = content.replace(/text-blue-600/g, 'text-blue-400');
    content = content.replace(/text-blue-800/g, 'text-blue-300');
    content = content.replace(/border-blue-200/g, 'border-blue-500/30');

    content = content.replace(/border-red-100/g, 'border-red-500/20');
    content = content.replace(/border-green-100/g, 'border-green-500/20');
    content = content.replace(/border-yellow-100/g, 'border-yellow-500/20');

    // 4. Inputs
    content = content.replace(/className=\"w-full bg-white\/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-white\/20\"/g, 'className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"');
    content = content.replace(/className=\"w-full pl-10 pr-4 py-2\.5 border border-white\/20 rounded-xl bg-white\/5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300\"/g, 'className="w-full pl-10 pr-4 py-2.5 border border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"');
    content = content.replace(/className=\"w-full pl-10 pr-4 py-2\.5 border border-white\/20 rounded-xl bg-white\/5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500\"/g, 'className="w-full pl-10 pr-4 py-2.5 border border-white/20 rounded-xl bg-white/5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"');
    
    // Some selects might be hidden:
    content = content.replace(/<option value=\"\">/g, '<option value="" className="text-gray-900">');
    content = content.replace(/<option key=\{([^\}]+)\} value=\{([^\}]+)\}>/g, '<option key={$1} value={$2} className="text-gray-900">');
    content = content.replace(/<option value=\"([^\"]+)\">/g, '<option value="$1" className="text-gray-900">');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated styles in ${filePath}`);
    }
}
