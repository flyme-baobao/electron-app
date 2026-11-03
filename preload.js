window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        console.log('====================================');
        console.log(dependency, process.versions[dependency]);
        console.log('====================================');
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
})