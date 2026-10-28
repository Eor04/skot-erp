const fs = require('fs');

const filePath = 'src/app/(pos)/cash-close/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace input styles
content = content.replace(
    /className="w-full border border-white\/20 rounded-xl px-3 py-2\.5 text-sm/g,
    'className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/40'
);

content = content.replace(
    /className="w-full bg-green-600 hover:bg-green-700/g,
    'className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
);

content = content.replace(
    /className="w-full bg-red-600 hover:bg-red-700/g,
    'className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
);

content = content.replace(
    /focus:ring-green-300/g,
    'focus:ring-purple-400'
);

content = content.replace(
    /focus:ring-slate-400/g,
    'focus:ring-pink-400'
);

content = content.replace(
    /bg-slate-800 text-white/g,
    'bg-white/10 text-white shadow-inner'
);

// Tab buttons
content = content.replace(
    /bg-green-600 text-white shadow-sm shadow-green-200/g,
    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-transparent'
);

content = content.replace(
    /bg-red-600 text-white shadow-sm shadow-red-200/g,
    'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border-transparent'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done refining form styles');
