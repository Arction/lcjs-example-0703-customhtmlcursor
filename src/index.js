/*
 * LightningChartJS example that showcases creation of a custom cursor in ChartXY.
 *
 * This variant uses HTML & CSS to display the cursor components, but the actual cursor logic is implemented using LCJS events and methods.
 */

// Import LightningChartJS
const lcjs = require('@lightningchart/lcjs')

// Import data-generators from 'xydata'-library.
const { createProgressiveTraceGenerator } = require('@lightningchart/xydata')

// Extract required parts from LightningChartJS.
const { lightningChart, AxisTickStrategies, Themes } = lcjs

// X step between data points.
const dataFrequency = 30 * 24 * 60 * 60 * 1000

// Create a XY Chart.
const chart = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
    .ChartXY({
        defaultAxisX: { type: 'linear-highPrecision' },
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
    })
    // set title of the chart
    .setTitle('Custom Cursor using HTML')

// Configure X axis as date time.
chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime)

chart.getDefaultAxisY().setTitle('Stock price variation €')

// Generate data and create the series.
const series = chart.addPointLineSeries().setMouseInteractions(false)

createProgressiveTraceGenerator()
    .setNumberOfPoints(20)
    .generate()
    .toPromise()
    .then((data) =>
        data.map((point) => ({
            x: Date.now() + point.x * dataFrequency,
            y: point.y,
        })),
    )
    .then((data) => {
        series.add(data)
    })

// ::: Custom HTML cursor :::
const html = document.createElement('div')
document.body.append(html)
html.style.position = 'fixed'
html.style.backgroundColor = 'black'
html.style.border = '1px solid white'
html.style.color = 'white'
html.style.fontFamily = 'Segoe UI'
html.style.padding = '5px'
html.style.borderRadius = '3px'
html.style.pointerEvents = 'none'
html.style.transition = 'opacity 0.5s'
html.style.transform = 'translateY(-100%)'
chart.setCustomCursor((_, hit) => {
    if (hit) {
        html.style.opacity = '1.0'
        const locClient = chart.translateCoordinate(hit, chart.coordsAxis, chart.coordsClient)
        html.style.left = `${locClient.clientX}px`
        html.style.top = `${locClient.clientY}px`
        html.innerHTML = `<b>${hit.axisX.formatValue(hit.x)}</b><br>Y = ${hit.axisY.formatValue(hit.y)}`
    } else {
        html.style.opacity = '0.0'
    }
})
