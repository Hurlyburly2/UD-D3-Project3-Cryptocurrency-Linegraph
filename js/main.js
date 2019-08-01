// Create margins, svg, and graph group

let margin = { left: 80, right: 100, top: 50, bottom: 100 }
let height = 500 - margin.top - margin.bottom
let width = 800 - margin.left - margin.right

let svg = d3.select("#chart-area").append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  
let g = svg.append('g')
  .attr('transform', 'translate(' + margin.left + ", " + margin.top + ')');


// For tooltip
// returns the index of a date in an array if it was added in order
let bisectDate = d3.bisector((cleanData) => { return cleanData.day }).left

//Scales
let x = d3.scaleTime().range([0, width])
let y = d3.scaleLinear().range([height, 0])

// Axis generators
let xAxisCall = d3.axisBottom()
  .ticks(4)
let yAxisCall = d3.axisLeft()
  

// Axis groups
let xAxis = g.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0, ' + height + ')')
let yAxis = g.append('g')
  .attr('class', 'y axis')

// Y Axis Label
let yLabel = g.append('text')
  .attr('class', 'axis-title')
  .attr('transform', 'rotate(-90)')
  .attr('x', 0)
  .attr('y', 30)
  .style('text-anchor', 'end')
  .style('font-size', '20px')
  .attr('fill', '#5D6971')

// Get from page
let cleanData = {}
let parseTime = d3.timeParse("%d/%m/%Y")
let maximumYear = parseTime("31/10/2017").getTime()
let minimumYear = parseTime("12/05/2013").getTime()

// First Line
g.append('path')
  .attr('class', 'line')
  .attr('fill', 'none')
  .attr('stroke', 'grey')
  .attr('stroke-width', '1px')

d3.json('data/coins.json').then((data) => {
  let currencies = Object.keys(data)
  
  currencies.forEach((currency) => {
    cleanData[currency] = []
    data[currency].forEach((day) => {
      if (day["24h_vol"] != null && day.date != null && day.market_cap != null && day.price_usd != null) {
        new_day = {
          daily_vol: parseInt(day["24h_vol"]),
          day: parseTime(day.date),
          market_cap: parseInt(day.market_cap),
          price_usd: parseFloat(day.price_usd)
        }
        cleanData[currency].push(new_day)
      }
    })
    
    update(cleanData)
  })
})

$("#var-select")
  .on('change', () => {
    update()
  })
  
$("#coin-select")
  .on('change', () => {
    update()
  })

const update = () => {
  let currentCoin = $("#coin-select").val()
  let currentDataType = $("#var-select").val()
  var t = function(){ return d3.transition().duration(500); }
  
  let sliderValues = $("#date-slider").slider("values")
  let currentCoinData = cleanData[currentCoin].filter((day) => {
    return day.day >= sliderValues[0] && day.day <= sliderValues[1]
  })
  
  x.domain(d3.extent(currentCoinData, (currency) => { return currency.day }))  
  y.domain([d3.min(currentCoinData, (currency) => { return currency[currentDataType] }), 
      d3.max(currentCoinData, (currency) => { return currency[currentDataType] }) ])
  
  if (currentDataType == "price_usd") {
    yLabel.text("Price (USD)")
    yAxisCall.tickFormat((string) => { return "$" + string.toFixed(2) })
  } else if (currentDataType == "market_cap") {
    yLabel.text("Market Capitalization")
    yAxisCall.tickFormat((string) => { return d3.format(",.2r")(string / 1000000) + "M" })
  } else if (currentDataType == "daily_vol") {
    yLabel.text("24 Hour Trading Volume")
    yAxisCall.tickFormat((string) => { return d3.format(",.2r")(string / 1000000) + "M" })
  }
  
  xAxis
    .transition(t())
    .call(xAxisCall.scale(x))
  yAxis
    .transition(t())
    .call(yAxisCall.scale(y))
  
  let line = d3.line()
    .x((data) => { return x(data.day)} )
    .y((data) => { return y(data[currentDataType])} )

  let formatTime = d3.timeFormat("%m/%d/%y")
  $("#dateLabel1").text(formatTime(new Date(sliderValues[0])))
  $("#dateLabel2").text(formatTime(new Date(sliderValues[1])))
    
  g.select('.line')
    .transition(t)
    .attr('d', line(currentCoinData))
    
  // TOOLTIP
  
  let focus = g.append('g') // hide or show whole tooltip
    .attr('class', 'focus')
    .style('display', 'none')
  focus.append('line')    // adds a vertical line from x-axis to focused point
    .attr('class', 'x-hover-line hover-line')
    .attr('y1', 0)
    .attr('y2', height)
  focus.append('line')    // adds a horizontal line
    .attr('class', 'y-hover-line hover-line')
    .attr('x1', 0)
    .attr('x2', width)
  focus.append('circle')    // adds circle to focus
    .attr('r', 7.5)
  focus.append('text')      // appends text to focus
    .attr('x', 15)
    .attr('dy', '.31em')
  svg.append('rect')          // invisible rectange for attaching events
    .attr('transform', 'translate(' + margin.left + "," + margin.top + ")")
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .on('mouseover', () => { focus.style('display', null) })
    .on('mouseout', () => { focus.style('display', 'none') })
    .on('mousemove', mousemove)
    
  function mousemove() {
    let x0 = x.invert(d3.mouse(this)[0])
    let i = bisectDate(currentCoinData, x0, 1)
    let d0 = currentCoinData[i - 1]
    let d1 = currentCoinData[i]
    let d = (d1 && d0) ? (x0 - d0.date > d1.date - x0 ? d1 : d0) : 0;
    focus.attr('transform', 'translate(' + x(d.day) + ", " + y(d[currentDataType]) + ")")
    focus.select('text').text(d[currentDataType])
    focus.select('.x-hover-line').attr('y2', height - y(d[currentDataType]))
    focus.select('.y-hover-line').attr('x2', -x(d.day))
  }
  
}

$("#date-slider").slider({
  range: true,
  max: parseTime("31/10/2017").getTime(),
  min: parseTime("12/05/2013").getTime(),
  step: 86400000,
  values: [parseTime("12/5/2013").getTime(), parseTime("31/10/2017").getTime()],
  slide: function(event, ui){
    update()
  }
})
