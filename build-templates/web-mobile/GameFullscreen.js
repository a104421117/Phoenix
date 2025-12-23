
(function () {
    function init() {
        var currentY = 0;
        // 是否正在開啟外接館
        window.openingOtherGame = false;

        function isMobile() {
            return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        function isIPhone() {
            return /iPhone/i.test(navigator.userAgent);
        }

        function isAndroid() {
            return /Android/i.test(navigator.userAgent);
        }
        document.addEventListener('DOMContentLoaded', function () {
            const swipe = document.getElementById('swipe');
            const fullscreen = document.getElementById('fullscreen');
            const gameCanvas = document.getElementById(`GameCanvas`);
            const swipes = document.getElementById('swipes');
            if (isAndroid() && !isIPhone() && document.fullscreenEnabled) {

                document.getElementById("toggle-fullscreen").style.visibility = "visible";

                function fullscreenchanged(event) {
                    if (document.fullscreenElement) {
                    } else {
                        document
                            .getElementById("toggle-fullscreen").style.visibility = "visible";
                    }
                }

                gameCanvas.addEventListener("fullscreenchange", fullscreenchanged);

                gameCanvas.onfullscreenchange = fullscreenchanged;

            }

            function isPortrait() {
                if (screen.orientation.type == 'landscape-primary' || screen.orientation.type == 'landscape-secondary') {

                    return false;
                } else {
                    return true;
                }
            }

            function showFullScreen() {
                if (!window.openingOtherGame) {
                    resizeSwipe()
                    swipes.style.visibility = 'hidden';
                    swipe.style.visibility = 'visible';
                }
            }

            function hideFullScreen(isChange = false) {
                setTimeout(function () {
                    if (isChange) {
                        swipe.style.visibility = 'hidden';
                        fullscreen.classList.add('no-click');
                    }
                    else if (!isPortrait()) {
                        swipe.style.visibility = 'hidden';
                        fullscreen.classList.add('no-click');
                    }
                }, 600);
            }

            function setSwipeBackground() {
                const o = 'images';
                swipe.style.backgroundImage = 'url('.concat(o, '/phone.gif)');
            }
            function setSwipesBackground() {
                const o = 'images';
                swipes.style.backgroundImage = 'url('.concat(o, '/swipeMobile.bbbe5.gif)');
            }
            function firstTimeEnterGame() {
                fullscreen.classList.remove('no-click');
                if (isPortrait()) {
                    showFullScreen();
                }
                else {
                    hideFullScreen();
                    updateHintVisibility();
                }
                setSwipeBackground();
            }
            function isFullscreenVisual() {
                // 標準全螢幕
                if (document.fullscreenElement) return true;

                // 安卓 Chrome / iOS 瀏覽器隱藏地址列的近似判斷
                return window.innerHeight >= screen.height * 0.95;
            }
            function updateHintVisibility() {
                if (!isFullscreenVisual()) {
                    swipes.style.visibility = 'visible';
                    setSwipesBackground();
                } else {
                    swipes.style.visibility = 'hidden';
                }

            }
            // 監聽手指觸控事件
            ['touchstart', 'touchmove', 'touchend'].forEach(evt => {
                document.addEventListener(evt, updateHintVisibility, { passive: true });
            });

            if (isMobile() && 'orientation' in screen) {


                firstTimeEnterGame();

                screen.orientation.addEventListener("change", (event) => {
                    if (window.openingOtherGame == false) {
                        if (isPortrait()) {
                            showFullScreen();
                        }
                        else {
                            hideFullScreen(true);
                            updateHintVisibility();
                        }
                    }
                });
            }
        });

        function resizeSwipe() {
            const swipe = document.getElementById('swipe');
            if (!swipe) return;

            const vh = window.visualViewport
                ? window.visualViewport.height
                : window.innerHeight;

            swipe.style.height = vh + 'px';
            swipe.style.width = window.innerWidth + 'px';
        }

        // 旋轉 / resize 都重新算
        window.addEventListener('resize', resizeSwipe);
        window.addEventListener('orientationchange', () => {
            // 延遲一點，等 Chrome 算完 viewport
            setTimeout(resizeSwipe, 100);
        });
        const noSleepEl = document.getElementById(`nosleep`);
        if (isMobile() && 'wakeLock' in navigator) {
            //#region 不進入休眠 - 行動裝置
            var wakeLock = null;
            noSleepEl.style.visibility = "visible";


            noSleepEl.addEventListener('click', async function () {
                await requestWakeLock();
                noSleepEl.style.visibility = "hidden";
            });


            const requestWakeLock = async () => {
                try {
                    wakeLock = await navigator.wakeLock.request();
                    wakeLock.addEventListener('release', () => {

                    });

                } catch (err) {
                    noSleepEl.style.visibility = "hidden";
                    console.error(`${err.name}, ${err.message}`);
                }
            };

            // …and release it again after 5s.
            window.setTimeout(() => {
                if (wakeLock !== null) {
                    wakeLock.release();
                    wakeLock = null;
                }
            }, 5000);

            const handleVisibilityChange = async () => {
                if (wakeLock !== null && document.visibilityState === 'visible') {
                    await requestWakeLock();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            //#endregion
        }

    }




    init();
})();
