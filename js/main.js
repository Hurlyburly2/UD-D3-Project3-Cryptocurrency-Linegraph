// Create margins, svg, and graph group

let margin = { left: 80, right: 100, top: 50, bottom: 100 }
let height = 500 - margin.top - margin.bottom
let width = 800 - margin.left - margin.right

let svg = d3.select("#chart-area").append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  
let g = svg.append('g')
  .attr('transform', 'translate(' + margin.left + ", " + margin.top + ')');

// time parses for x-scale (interprets 4-digit strings as years)
let parseTime = d3.timeParse("%Y")

// For tooltip
// returns the index of a date in an array if it was added in order
let bisectDate = d3.bisector((data) => { return data.year }).left

//Scales
let x = d3.scaleTime().range([0, width])
let y = d3.scaleLinear().range([height, 0])

// Axis generators
let xAxisCall = d3.axisBottom()
let yAxisCall = d3.axisLeft()
  .ticks(6)
  .tickFormat((string) => { return parseInt(string / 1000) + "k"})

// Axis groups
let xAxis = g.append('g')
  .attr('class', 'x axis')
  .attr('transform', 'translate(0, ' + height + ')')
let yAxis = g.append('g')
  .attr('class', 'y axis')

// Y Axis Label
yAxis.append('text')
  .attr('class', 'axis-title')
  .attr('transform', 'rotate(-90)')
  .attr('y', 6)
  .attr('dy', '.71em')
  .style('text-anchor', 'end')
  .attr('fill', '#5D6971')
  .text('Population')

// Line path generator
let line = d3.line()
  .x((data) => { return x(data.year)} )
  .y((data) => { return y(data.value)} )

// Get from page


d3.json('data/coins.json').then((data) => {
  let currencies = Object.keys(data)
  let cleanData = {}
  let parseTime = d3.timeParse("%m/%d/%Y")
  
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
  })

  x.domain(d3.extent(data, (data) => { return data.year }))  
  y.domain([d3.min(data, (data) => { return data.value }) / 1.005, 
      d3.max(data, (data) => { return data.value }) * 1.005 ])

  xAxis.call(xAxisCall.scale(x))
  yAxis.call(yAxisCall.scale(y))

  g.append('path')
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', 'grey')
    .attr('stroke-width', '3px')
    .attr('d', line(data))
    
  //  TOOLTIP
  
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
    
  g.append('rect')          // invisible rectange for attaching events
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .on('mouseover', () => { focus.style('display', null) })
    .on('mouseout', () => { focus.style('display', 'none') })
    .on('mousemove', mousemove)
    
  function mousemove() {
    let x0 = x.invert(d3.mouse(this)[0])  // find time value that matches coordinate info of mouse
    let i = bisectDate(data, x0, 1)   // find the date where the time would belong if it was a datapoint
    let d0 = data[i - 1]
    let d1 = data[i]
    let d = x0 - d0.year > d1.year - x0 ? d1 : d0     // comparing date we're looking at with closest two time values. Returns closest data point
    focus.attr('transform', 'translate(' + x(d.year) + ", " + y(d.value) + ")")   // shifts focus to data point we want to be looking at
    focus.select('text').text(d.value)    // update tooltip with y value we're looking at
    focus.select('.x-hover-line').attr('y2', height - y(d.value))   // adjusts second point of x-axis line to new y value
    focus.select('.y-hover-line').attr('x2', -x(d.year))    // does the same with y-axis
  }
})
