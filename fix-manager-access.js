const fs = require('fs');

const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update POS Açaí showWhen
content = content.replace(
    /showWhen: \(role: string, types: string\[\]\) =>\s+\['MANAGER'\].includes\(role\) \|\| \(role === 'CASHIER' && types.includes\('ACAI'\)\),/g,
    `showWhen: (role: string, types: string[]) =>
            ['MANAGER', 'CASHIER'].includes(role) && types.includes('ACAI'),`
);

// 2. Update POS Burgers showWhen
content = content.replace(
    /showWhen: \(role: string, types: string\[\]\) =>\s+\['MANAGER'\].includes\(role\) \|\| \(role === 'CASHIER' && types.includes\('HAMBURGUESAS'\)\),/g,
    `showWhen: (role: string, types: string[]) =>
            ['MANAGER', 'CASHIER'].includes(role) && types.includes('HAMBURGUESAS'),`
);

// 3. Update Factory showWhen (Remove MANAGER)
content = content.replace(
    /showWhen: \(role: string, types: string\[\]\) =>\s+\['ADMIN', 'MANAGER'\].includes\(role\) \|\| role === 'WAREHOUSE',/g,
    `showWhen: (role: string, types: string[]) =>
            ['ADMIN'].includes(role) || role === 'WAREHOUSE',`
);

// 4. Update Admin showWhen (Remove MANAGER)
content = content.replace(
    /showWhen: \(role: string\) => \['ADMIN', 'MANAGER'\].includes\(role\),/g,
    `showWhen: (role: string) => ['ADMIN'].includes(role),`
);

// 5. Update loadStats to fetch specific stats for MANAGER or skip
content = content.replace(
    /const \[salesRes, alertsRes, cashRes\] = await Promise.all\(\[\n\s+fetch\(\`\/api\/admin\/sales\?from=\$\{today\}&to=\$\{today\}&limit=1\`\),\n\s+fetch\('\/api\/inventory\/alerts'\),\n\s+fetch\('\/api\/cash-close\?limit=20'\),\n\s+\]\);/g,
    `const branchQuery = user.role === 'MANAGER' && user.branchIds?.[0] ? \`&branchId=\${user.branchIds[0]}\` : '';
            const [salesRes, alertsRes, cashRes] = await Promise.all([
                fetch(\`/api/admin/sales?from=\${today}&to=\${today}&limit=1\${branchQuery}\`),
                fetch(\`/api/inventory/alerts\${branchQuery ? '?'+branchQuery.substring(1) : ''}\`),
                fetch(\`/api/cash-close?limit=20\${branchQuery}\`),
            ]);`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed page.tsx');
