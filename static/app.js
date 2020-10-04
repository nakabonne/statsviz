(function () {
    function $(id) {
        return document.getElementById(id);
    }

    function buildWebsocketURI() {
        var loc = window.location, ws_prot = "ws:";
        if (loc.protocol === "https:") {
            ws_uri = "wss:";
        }
        return ws_prot + "//" + loc.host + loc.pathname + "ws"
    }

    const dataRetentionSeconds = 60;

    /* WebSocket callbacks */

    let socket = new WebSocket(buildWebsocketURI());
    console.log("Attempting Connection...");

    socket.onopen = () => {
        console.log("Successfully Connected");
    };

    socket.onclose = event => {
        console.log("Socket Closed Connection: ", event);
        socket.send("Client Closed!")
    };

    socket.onerror = error => {
        console.log("Socket Error: ", error);
    };

    var initDone = false;
    socket.onmessage = event => {
        let memStats = JSON.parse(event.data)
        if (!initDone) {
            stats.init(dataRetentionSeconds, memStats.Mem);
            initDone = true;
            return;
        }

        updateStats(memStats.Mem);
    }

    function updateStats(memStats) {
        stats.pushData(new Date(), memStats);

        if (ui.isPaused()) {
            return
        }

        let data = stats.slice(dataRetentionSeconds);
        if (data.heap[0].length == 1) {
            ui.createPlots(data);
        }
        ui.updatePlots(data);
    }

}());
