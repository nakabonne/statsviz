// stats holds the data and function to modify it.
var stats = (function () {
    var m = {};

    const idxTimes = 0;
    const idxHeapAlloc = 1;
    const idxHeapSys = 2;
    const idxHeapIdle = 3;
    const idxHeapInuse = 4;

    const numSeriesHeap = 4;
    const totalSeries = 1 + numSeriesHeap; // times + other series

    var data = {
        series: new Array(totalSeries), // TODO: rename to timeseries 
        lastGCs: new Array(),

        bySize: null,
    };

    m.init = function (buflen, memStats) {
        const extraBufferCapacity = 20; // 20% of extra (preallocated) buffer datapoints
        const bufcap = buflen + (buflen * extraBufferCapacity) / 100; // number of actual datapoints

        for (let i = 0; i < totalSeries; i++) {
            data.series[i] = new Buffer(buflen, bufcap);
        }

        // heatmap: y
        for (let i = 0; i < memStats.BySize.length; i++) {
            m.classSizes.push(memStats.BySize[i].Size);

            if (i == memStats.BySize.length - 1) {
                let name = '> ' + ui.humanBytes(memStats.BySize[i].Size);
                m.classSizeNames.push(name);
            } else {
                let name = ui.humanBytes(memStats.BySize[i].Size) + ' -' + ui.humanBytes(memStats.BySize[i + 1].Size)
                m.classSizeNames.push(name);
            }
        }

        data.bySize = new Array(m.classSizes.length);
        for (let i = 0; i < data.bySize.length; i++) {
            data.bySize[i] = new Buffer(buflen, bufcap);
        }
    };

    // Array of the last relevant GC times
    m.lastGCs = data.lastGCs;

    function updateLastGC(memStats) {
        const nanoToSeconds = 1000 * 1000 * 1000;
        let t = Math.floor(memStats.LastGC / nanoToSeconds);

        let lastGC = new Date(t * 1000);

        if (lastGC != data.lastGCs[data.lastGCs.length - 1]) {
            data.lastGCs.push(lastGC);
        }

        // Remove from the lastGCs array the timestamps which are prior to
        // the minimum timestamp in 'series'.
        let mints = data.series[idxTimes]._buf[0];
        let mingc = 0;
        for (let i = 0, n = data.lastGCs.length; i < n; i++) {
            if (data.lastGCs[i] > mints) {
                break;
            }
            mingc = i;
        }
        data.lastGCs.splice(0, mingc);
    }

    // Contain indexed class sizes, this is initialized after reception of the first message.
    m.classSizes = new Array();
    m.classSizeNames = new Array();

    m.pushData = function (ts, memStats) {
        data.series[idxTimes].push(ts); // timestamp
        data.series[idxHeapAlloc].push(memStats.HeapAlloc);
        data.series[idxHeapSys].push(memStats.HeapSys);
        data.series[idxHeapIdle].push(memStats.HeapIdle);
        data.series[idxHeapInuse].push(memStats.HeapInuse);

        for (let i = 0; i < memStats.BySize.length; i++) {
            const size = memStats.BySize[i];
            data.bySize[i].push(size.Mallocs - size.Frees);
        }

        updateLastGC(memStats);
    }

    m.length = function () {
        return data.series[idxTimes].length();
    }

    m.slice = function (nitems) {
        // Time data
        let times = data.series[idxTimes].slice(nitems);

        // Heap plot data
        let heap = new Array(numSeriesHeap);
        // TODO: remove since now we declare times separately
        heap[0] = times;
        for (let i = 1; i <= numSeriesHeap; i++) {
            heap[i] = data.series[i].slice(nitems);
        }

        // BySizes heatmap data
        let bySizes = new Array(data.bySize.length);
        for (let i = 0; i < data.bySize.length; i++) {
            const size = data.bySize[i];
            bySizes[i] = data.bySize[i].slice(nitems);
        }

        return {
            times: times,
            heap: heap,
            bySizes: bySizes,
        }
    }

    return m;
}());