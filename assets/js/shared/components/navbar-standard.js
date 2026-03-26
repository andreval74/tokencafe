/**
 * Navbar Standard Logic
 * Handles wallet status binding for the standard navbar component.
 */
(function() {
    const init = () => {
        if (window.bindWalletStatusUI) {
            window.bindWalletStatusUI({
                addressEl: "#wallet-address",
                connectBtnEl: "#connect-wallet-btn",
                dashboardLinkEl: "#dashboard-link",
                statusWrapperEl: "#wallet-status",
            });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
