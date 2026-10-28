const fs = require('fs');

const filePath = 'src/app/expenses/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace CATEGORIES colors
content = content.replace(
    /bg-orange-100 text-orange-700/g,
    'bg-orange-500/20 text-orange-400 border border-orange-500/30'
);
content = content.replace(
    /bg-yellow-100 text-yellow-700/g,
    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
);
content = content.replace(
    /bg-blue-100\s+text-blue-700/g,
    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
);
content = content.replace(
    /bg-purple-100 text-purple-700/g,
    'bg-purple-500/20 text-purple-400 border border-purple-500/30'
);
content = content.replace(
    /bg-cyan-100\s+text-cyan-700/g,
    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
);
content = content.replace(
    /bg-gray-100\s+text-gray-700/g,
    'bg-white/10 text-white/70 border border-white/20'
);

// 2. Global background wrapper & glows
const globalWrapperRegex = /<div className="min-h-screen bg-gray-50">/;
const globalWrapperReplacement = `<div className="min-h-screen bg-slate-950 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-rose-600/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
            <div className="relative z-10">`;

if (content.match(globalWrapperRegex)) {
    content = content.replace(globalWrapperRegex, globalWrapperReplacement);
    
    // add closing div at the end
    const lastDivIdx = content.lastIndexOf('</div>');
    if (lastDivIdx !== -1) {
        content = content.substring(0, lastDivIdx) + '</div>\n' + content.substring(lastDivIdx);
    }
}

// 3. Text colors
content = content.replace(/text-gray-900/g, 'text-white/90');
content = content.replace(/text-gray-800/g, 'text-white/80');
content = content.replace(/text-gray-700/g, 'text-white/80');
content = content.replace(/text-gray-600/g, 'text-white/70');
content = content.replace(/text-gray-500/g, 'text-white/60');
content = content.replace(/text-gray-400/g, 'text-white/40');
content = content.replace(/text-gray-300/g, 'text-white/30');

// 4. Cards and Backgrounds
content = content.replace(/bg-white rounded-2xl shadow-sm border border-gray-100/g, 'bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10');
content = content.replace(/bg-white rounded-2xl shadow-xl/g, 'bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10');
content = content.replace(/bg-rose-50 rounded-2xl border border-rose-100/g, 'bg-rose-500/10 rounded-2xl border border-rose-500/20 backdrop-blur-md');
content = content.replace(/bg-white border border-gray-200/g, 'bg-white/5 border border-white/10');
content = content.replace(/border-b border-gray-100/g, 'border-b border-white/10');
content = content.replace(/hover:bg-gray-50/g, 'hover:bg-white/10');
content = content.replace(/border border-gray-200/g, 'border border-white/20');
content = content.replace(/bg-gray-300/g, 'bg-white/10');

// 5. Inputs and forms
content = content.replace(
    /className="w-full border border-gray-200 rounded-xl px-3 py-2\.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/g,
    'className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500"'
);

content = content.replace(
    /className="w-full border border-gray-200 rounded-xl px-3 py-2\.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"/g,
    'className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"'
);

// Filters
content = content.replace(
    /className={`px-3 py-1\.5 rounded-xl text-xs font-medium transition \$\{(!filterCat \|\| filterCat === c\.value) \? 'bg-rose-600 text-white' : 'bg-white border border-gray-200 text-white\/70 hover:bg-white\/10'\}`/g,
    "className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${(!filterCat || filterCat === c.value) ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'}`"
);

// Re-adjust some specifics
content = content.replace(
    /bg-rose-600 text-white'/g,
    "bg-rose-600 text-white shadow-lg shadow-rose-500/30'"
);

content = content.replace(
    /bg-white border border-white\/20 text-white\/70 hover:bg-white\/10'/g,
    "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'"
);

// Toast
content = content.replace(/bg-green-600/g, 'bg-green-500/90 backdrop-blur border border-green-500/50');
content = content.replace(/bg-red-600/g, 'bg-red-500/90 backdrop-blur border border-red-500/50');

// New Expense modal button
content = content.replace(/bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white/g, 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-500/30');

// Text area and selects fix for general border-gray-200 regex missed
content = content.replace(/border-white\/20 text-white\/70/g, 'border-white/10 text-white/70');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Expenses styles replaced');
