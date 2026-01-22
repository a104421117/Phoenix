
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
