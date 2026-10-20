// Exercise the owner's explicit model choice. Older public versions already
// select a model; keep those read-only checks usable during rollout.
export async function chooseMenuPreview(page, {manual = false} = {}) {
    await page.locator('.ai-gallery').waitFor({timeout: 180000});
    const selected = page.locator('.ai-selected .mini-menu');
    if (manual && await selected.count()) throw Error('The menu selected a model before the owner chose it.');
    if (!await selected.count()) {
        const cards = page.locator('.ai-style-card');
        await cards.first().waitFor();
        if (await cards.count() !== 4) throw Error('The owner needs four initial model choices.');
        await cards.first().getByRole('button', {name: /^Escolher /}).click();
    }
    await selected.waitFor({timeout: 180000});
}
