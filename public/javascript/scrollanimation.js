let positionY = 0;
const animationThreshold = -613;
const scrollUnlockThreshold = -950;
const dampingFactor = 0.2;

window.addEventListener('wheel', function(event) {
    if (positionY > scrollUnlockThreshold) {
        event.preventDefault();
    }

    const delta = event.deltaY * dampingFactor;
    if (event.deltaY > 0) {
        positionY -= delta;
    } else if (event.deltaY < 0) {
        positionY -= delta;
        if (positionY > 0) {
            positionY = 0;
        }
    }

    let object = document.getElementById('movingObject');
    object.style.transform = `translate(-50%, -50%) translateY(${positionY}px)`;
    object.style.transition = 'transform 0.1s ease-out';

    makeinvisible(positionY);
    showText(positionY);

    if (positionY <= scrollUnlockThreshold) {
        document.body.style.overflow = 'auto';
    } else {
        document.body.style.overflow = 'hidden';
    }
});

function makeinvisible(y) {
    const threshold = 613;
    let object = document.getElementById('movingObject');
    object.style.transition = 'opacity 0.3s ease';
    if (Math.abs(y) >= threshold) {
        object.style.opacity = '0';
    } else {
        object.style.opacity = '1';
    }
}

function showText(y) {
    const threshold = 613;
    const maxThreshold = 950;
    const minFontSize = 20;
    const maxFontSize = 100;
    let textElement = document.querySelector('.animation-text');

    textElement.style.transition = 'opacity 0.5s ease, font-size 0.3s ease';
    if (Math.abs(y) >= threshold) {
        const progress = Math.min(Math.abs(y) - threshold, maxThreshold - threshold) / (maxThreshold - threshold);
        const fontSize = minFontSize + (maxFontSize - minFontSize) * progress;
        textElement.style.opacity = '1';
        textElement.querySelector('h1').style.fontSize = `${fontSize}px`;
    } else {
        textElement.style.opacity = '0';
        textElement.querySelector('h1').style.fontSize = `${minFontSize}px`;
    }
}