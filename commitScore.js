/**
 * Used to initialize promise
 * @author karthick.k
 * @param   {string} url API
 * @returns {Object} result - Error or data
 */
var getPromise = function (url) {
    var promise = new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest();
        request.open("GET", url);
        request.onload = function () {
            if (request.status == 200) {
                data = JSON.parse(request.response);
                resolve(data);
            } else {
                reject(request.statusText);
            }
        };
        request.onerror = function () {
            reject("Error fetching data");
        };
        request.send();
    });
    return promise;
};

/**
 * Used to hide chart
 * @author karthick.k
 */
var hideChart = function () {
    document.getElementById("metrics-wrapper").style.visibility = "hidden";
};

/**
 * Used to show chart
 * @author karthick.k
 */
var showChart = function () {
    document.getElementById("metrics-wrapper").style.visibility = "visible";
};

/**
 * Used to handle and display error in the page
 * @author karthick.k
 * @param {string} err error message
 */
var error = function (err) {
    var errorMessage = document.getElementById('errorMessage');
    if (err === "Loading..." || err === null) {
        err = err;
    } else {
        err = "API error : " + err;
    }
    errorMessage.innerHTML = err;
};

/**
 * Highchart component
 * @author karthick.k
 */
var chartComponent = {
    initHighcharts: function () {
        this.chart = new Highcharts.chart('container', {
            title: {
                text: ''
            },
            xAxis: {
                type: "datetime"
            },
            series: []
        });
        this.chart.showLoading();
    },
    updateChart: function (metrics) {
        var scope = this;
        while (scope.chart.series.length > 0) {
            scope.chart.series[0].remove(true);
        }
        for (var key in metrics) {
            var data = [];
            for (var date in metrics[key]) {
                data.push([parseInt(date), metrics[key][date]]);
            }
            data.sort(function (a, b) {
                return a[0] - b[0];
            });
            var column = {
                type: "areaspline",
                data: data,
                name: key
            };
            scope.chart.addSeries(column, false);
        }
        scope.chart.redraw();
        scope.chart.hideLoading();
    }
};

/**
 * Used to display total/aggregated commit score
 * @author karthick.k
 * @param {object} computedValues values
 */
var plotMetrics = function (computedValues) {
    document.getElementById('total').innerHTML = computedValues.total;
    document.getElementById('additions').innerHTML = computedValues.additions;
    document.getElementById('deletions').innerHTML = computedValues.deletions;
    document.getElementById('noOfFiles').innerHTML = computedValues.noOfFiles;
}

/**
 * Used to generate chart based on the commit stats based on the date
 * @author karthick.k
 * @param {object} commits commit stats from the api
 */
var generateCommitStatsChart = function (commits) {
    if (commits.length) {
        error(null);
        showChart();
        var commitStats = {
            total: {},
            additions: {},
            deletions: {},
            noOfFiles: {}
        };
        var computedValues = {
            total: 0,
            additions: 0,
            deletions: 0,
            noOfFiles: 0
        };
        commits.forEach(function (commit) {
            var commitInfo = commit.stats;
            var date = new Date(commit.createdAt);
            var createdDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDay());
            computedValues.total += commitInfo.stats.total;
            computedValues.additions += commitInfo.stats.additions;
            computedValues.deletions += commitInfo.stats.deletions;
            computedValues.noOfFiles += commitInfo.files.length;
            if (commitStats.additions.hasOwnProperty(createdDate)) {
                commitStats.additions[createdDate] += commitInfo.stats.additions;
            } else {
                commitStats.additions[createdDate] = commitInfo.stats.additions;
            }
            if (commitStats.deletions.hasOwnProperty(createdDate)) {
                commitStats.deletions[createdDate] += commitInfo.stats.deletions;
            } else {
                commitStats.deletions[createdDate] = commitInfo.stats.deletions;
            }
            if (commitStats.total.hasOwnProperty(createdDate)) {
                commitStats.total[createdDate] += commitInfo.stats.total;
            } else {
                commitStats.total[createdDate] = commitInfo.stats.total;
            }
            if (commitStats.noOfFiles.hasOwnProperty(createdDate)) {
                commitStats.noOfFiles[createdDate] += commitInfo.files.length;
            } else {
                commitStats.noOfFiles[createdDate] = commitInfo.files.length;
            }
        });
        plotMetrics(computedValues);
        chartComponent.initHighcharts();
        chartComponent.updateChart(commitStats);
    } else {
        error("No commits available");
    }
};

/**
 * Used to get public events from the github api
 * @author karthick.k
 * @returns {Array} events
 */
var getPublicEvents = function () {
    var username = document.getElementById('username').value;
    var errorMessage = document.getElementById('errorMessage');
    errorMessage.innerHTML = "Loading...";
    getPromise("https://api.github.com/users/" + username + "/events/public").then(function (events) {
        if (events.length) {
            var promises = [];
            events.forEach(function (event) {
                if (event.payload.commits && event.payload.commits.length) {
                    event.payload.commits.forEach(function (commit) {
                        promises.push(getPromise(commit.url).then(function (stats) {
                            var result = {
                                createdAt: event.created_at,
                                stats: stats
                            };
                            return result;
                        }));
                    });
                }
            });
            Promise.all(promises).then(function (result) {
                generateCommitStatsChart(result);
            }, function (err) {
                error(err);
            });
        } else {
            error("No data available");
        }
    }, function (err) {
        error(err);
    });
};

/**
 * Used to handle get commit status action
 * @author karthick.k
 */
window.getCommitStatus = function () {
    hideChart();
    getPublicEvents();
};