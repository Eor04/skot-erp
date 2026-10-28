const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix ALL_MODULES declaration
content = content.replace(
    /href: '\/factory', emoji: '🏭', logo: '', title: user\?\.role === 'WAREHOUSE' \? 'Almacén y Fábrica' : 'Fábrica',/g,
    "href: '/factory', emoji: '🏭', logo: '', title: 'Fábrica',"
);

// Fix render
content = content.replace(
    /<h3 className="text-xl font-bold text-white mb-2">{mod.title}<\/h3>/g,
    '<h3 className="text-xl font-bold text-white mb-2">{mod.href === \'/factory\' && user?.role === \'WAREHOUSE\' ? \'Almacén y Fábrica\' : mod.title}</h3>'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed TS error!');
