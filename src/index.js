/*
 * LightningChartJS example that showcases creation of a custom cursor in ChartXY.
 *
 * This variant uses HTML & CSS to display the cursor components, but the actual cursor logic is implemented using LCJS events and methods.
 */

// Import LightningChartJS
const lcjs = require('@arction/lcjs')

// Import data-generators from 'xydata'-library.
const { createProgressiveTraceGenerator } = require('@arction/xydata')

// Extract required parts from LightningChartJS.
const { lightningChart, AutoCursorModes, AxisTickStrategies, translatePoint, Themes } = lcjs

// names of the data the series
const names = ['Stock Price A', 'Stock Price B', 'Stock Price C']
// define date that matches value of 0 on date time axis.
const dateOrigin = new Date(2020, 0, 1)
const dateOriginTime = dateOrigin.getTime()

// X step between data points.
const dataFrequency = 30 * 24 * 60 * 60 * 1000

// Create a XY Chart.
const chart = lightningChart()
    .ChartXY({
        // theme: Themes.darkGold
    })
    // Disable native AutoCursor to create custom
    .setAutoCursorMode(AutoCursorModes.disabled)
    // set title of the chart
    .setTitle('Custom Cursor using HTML')

// Configure X axis as date time.
chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) => tickStrategy.setDateOrigin(dateOrigin))

chart.getDefaultAxisY().setTitle('Stock price variation €')

// Generate data and create the series.
const series = new Array(3).fill(0).map((_, i) => {
    const nSeries = chart.addPointLineSeries().setMouseInteractions(false)
    return nSeries
})

Promise.all(
    series.map((nSeries) =>
        createProgressiveTraceGenerator()
            .setNumberOfPoints(20)
            .generate()
            .toPromise()
            // Map random generated data to start from a particular date with the frequency of dataFrequency
            .then((data) =>
                data.map((point) => ({
                    x: dateOriginTime + point.x * dataFrequency,
                    y: point.y,
                })),
            )
            // Shift the data by dateOriginTime
            .then((data) =>
                data.map((p) => ({
                    x: p.x - dateOriginTime,
                    y: p.y,
                })),
            )
            .then((data) => {
                nSeries.add(data)
            }),
    ),
).then(() => {
    chart.forEachAxis((axis) => axis.fit(false))
    requestAnimationFrame(() => {
        // Show custom cursor at start automatically.
        showCursorAt({ x: window.innerWidth * 0.4, y: window.innerHeight / 2 })
    })
})

// Read back series colors into CSS supported format "rgba(...)"
const colors = series.map((nSeries) => {
    const fill = nSeries.getStrokeStyle().getFillStyle()
    // NOTE: Assume SolidFill
    const color = fill.getColor()
    return `rgba(${color.getR()},${color.getG()},${color.getB()},${color.getA()})`
})

// Create custom cursor UI by adding HTML elements to the document.
const styleElem = document.head.appendChild(document.createElement('style'))
const textBox = document.createElement('div')
textBox.id = 'resultTable'
const line = document.createElement('div')
line.id = 'line'
const line2 = document.createElement('div')
line2.id = 'line2'
const arrow = document.createElement('div')
arrow.id = 'arrow'
textBox.appendChild(line)
textBox.appendChild(line2)
textBox.appendChild(arrow)
chart.engine.container.append(textBox)

// Implement custom cursor logic with events.
const showCursorAt = (mouseLocationEngine) => {
    // Translate mouse location to Axis.
    const mouseLocationAxis = translatePoint(mouseLocationEngine, chart.engine.scale, series[0].scale)

    // Solve nearest data point to the mouse on each series.
    const nearestDataPoints = series.map((el) => el.solveNearestFromScreen(mouseLocationEngine))

    // Find the nearest solved data point to the mouse.
    const nearestPoint = nearestDataPoints.reduce((prev, curr, i) => {
        if (!prev) return curr
        if (!curr) return prev
        return Math.abs(mouseLocationAxis.y - curr.location.y) < Math.abs(mouseLocationAxis.y - prev.location.y) ? curr : prev
    })

    if (nearestPoint) {
        // Translate data point from Axis to client.
        const nearestPointEngine = translatePoint(nearestPoint.location, series[0].scale, chart.engine.scale)
        const nearestPointClient = chart.engine.engineLocation2Client(nearestPointEngine.x, nearestPointEngine.y)

        // Position and format custom HTML cursor.
        if (nearestPoint.location.x > chart.getDefaultAxisX().getInterval().end / 1.5) {
            textBox.style.left = `${Math.round(nearestPointClient.x - textBox.clientWidth - 10)}px`
            textBox.style.top = `${Math.round(nearestPointClient.y - textBox.clientHeight / 2)}px`
            arrow.style.left = '142px'
            arrow.style.transform = 'translate(-40%, -50%) rotate(-135deg)'
        } else {
            textBox.style.left = `${Math.round(nearestPointClient.x + 10)}px`
            textBox.style.top = `${Math.round(nearestPointClient.y - textBox.clientHeight / 2)}px`
            arrow.style.left = '-1px'
            arrow.style.transform = 'translate(-50%, -50%) rotate(45deg)'
        }

        line.innerHTML = `<b>Date: </b> <span id = 'date'>${new Date(
            2021,
            0,
            nearestPoint.location.x / (24 * 60 * 60 * 1000) + 1,
        ).toLocaleDateString()}</span>`

        const point = nearestDataPoints.map((el) => (el ? el.location.y : 0))
        let rowElement = ''
        for (let i = 0; i < series.length; i++) {
            const sign = point[i] > 0 ? '+' : ''
            rowElement += `<div class='values' style='color: ${colors[i]}' ><span>${series[i].getName()}:</span> ${
                sign + chart.getDefaultAxisY().formatValue(nearestDataPoints[i].location.y)
            }</div>`
        }
        line2.innerHTML = rowElement

        textBox.style.opacity = 1
    } else {
        textBox.style.opacity = 0
    }
}

const mouseMoveHandler = (_, event) => {
    const mouseLocationClient = { x: event.clientX, y: event.clientY }
    // Translate mouse location to LCJS coordinate system for solving data points from series, and translating to Axes.
    const mouseLocationEngine = chart.engine.clientLocation2Engine(mouseLocationClient.x, mouseLocationClient.y)
    showCursorAt(mouseLocationEngine)
}
chart.onSeriesBackgroundMouseMove(mouseMoveHandler)
series.forEach((series) => {
    series.onMouseMove(mouseMoveHandler)
})

chart.onSeriesBackgroundMouseLeave((_, event) => {
    textBox.style.opacity = 0
})
chart.onSeriesBackgroundMouseDragStart((_, e) => {
    textBox.style.opacity = 0
})

chart.getDefaultAxisY().onIntervalChange(() => {
    textBox.style.opacity = 0
})
chart.getDefaultAxisX().onIntervalChange(() => {
    textBox.style.opacity = 0
})

// Add CSS.
function addStyle(styleString) {
    const style = document.createElement('style')
    style.textContent = styleString
    document.head.append(style)
}

addStyle(`
    #resultTable {
        background-color: rgba(24, 24, 24, 0.9);
        color: white;
        font-size: 12px;
        border: solid white 2px;
        border-radius: 5px;
        width: 142px;
        // height: 110px;
        height: auto;
        top: 0;
        left: 0;
        position: fixed;
        padding: 0;
        pointer-events:none;
        z-index: 1;
        transition: left 0.2s, top 0.2s, opacity 0.2s;
        opacity: 0.0;
    }
    #arrow {
        position: absolute;
        background-color: rgba(24, 24, 24);
        height: 10px;
        width: 10px;
        top: 49%;
        border-left: solid white 2px;
        border-bottom: solid white 2px;
        box-shadow: 0 0 10px rgba(0, 0, 0, .5);
        transform-origin: center center;
    }
    p {
        margin:0;
    }
    #date {
        text-align: center;
    }
    .values {
        display: flex;
        justify-content: space-between;
        align-items center;
        margin: 5px 0;
    }
    .values span {
        margin-right: 10px 
    }
    #line {
        background-color: grey;
        border-top-right-radius: 4px;
        border-top-left-radius: 4px;
        margin: 0;
        padding: 7px;
        font-size: 10px;
        height: 20%;
        font-family: Arial, sans-serif;
        width: auto;
        heigth: 100%;
    }
    #line2 {
        font-size: 13px;
        font-weight: 900;
        padding: 5px 14px
    }
`)
