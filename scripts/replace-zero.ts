import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (file: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walk(dirPath, callback);
        } else if (dirPath.endsWith('.tsx')) {
            callback(dirPath);
        }
    });
}

async function main() {
    walk('src', (file) => {
        const content = fs.readFileSync(file, 'utf8');
        
        // Match <input ... type="number" ... value={someVar} ... />
        // But doing this with regex on HTML tags is tricky across multiple lines.
        // Let's just find value={someVar} and see if it's a number input. 
        // A simpler way is to just replace value={var} with value={var === 0 ? '' : var} for specific known variables!
        
        let newContent = content
            .replace(/value=\{cashAmount\}/g, "value={cashAmount === 0 ? '' : cashAmount}")
            .replace(/value=\{cardAmount\}/g, "value={cardAmount === 0 ? '' : cardAmount}")
            .replace(/value=\{transferAmount\}/g, "value={transferAmount === 0 ? '' : transferAmount}")
            .replace(/value=\{quantity\}/g, "value={quantity === 0 ? '' : quantity}")
            .replace(/value=\{newStock\}/g, "value={newStock === 0 ? '' : newStock}")
            .replace(/value=\{newMin\}/g, "value={newMin === 0 ? '' : newMin}")
            .replace(/value=\{item\.requestedQty\}/g, "value={item.requestedQty === 0 ? '' : item.requestedQty}")
            .replace(/value=\{form\.quantity\}/g, "value={form.quantity === 0 ? '' : form.quantity}")
            .replace(/value=\{form\.plannedYield\}/g, "value={form.plannedYield === 0 ? '' : form.plannedYield}")
            .replace(/value=\{item\.quantity\}/g, "value={item.quantity === 0 ? '' : item.quantity}")
            .replace(/value=\{form\.tara\}/g, "value={form.tara === 0 ? '' : form.tara}")
            .replace(/value=\{item\.unitCost\}/g, "value={item.unitCost === 0 ? '' : item.unitCost}")
            .replace(/value=\{form\.price\}/g, "value={form.price === 0 ? '' : form.price}")
            .replace(/value=\{form\.costPrice\}/g, "value={form.costPrice === 0 ? '' : form.costPrice}")
            .replace(/value=\{form\.openingAmount\}/g, "value={form.openingAmount === 0 ? '' : form.openingAmount}")
            .replace(/value=\{form\.actualCash\}/g, "value={form.actualCash === 0 ? '' : form.actualCash}")
            .replace(/value=\{cashGiven\}/g, "value={cashGiven === 0 ? '' : cashGiven}")
            .replace(/value=\{cardGiven\}/g, "value={cardGiven === 0 ? '' : cardGiven}")
            .replace(/value=\{transferGiven\}/g, "value={transferGiven === 0 ? '' : transferGiven}");
            
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`Updated ${file}`);
        }
    });
}
main();
