function createTable(data) {
    // modified from http://bl.ocks.org/AMDS/4a61497182b8fcb05906
    var sortAscending = true;
    var table = d3.select('#page-wrap').append('table');
    var titles = d3.keys(data[0]);
    var headers = table.append('thead').append('tr')
                    .selectAll('th')
                    .data(titles).enter()
                    .append('th')
                    .text(function (d) {
                         return d;
                    })
                    .on('click', function (d) {
                        headers.attr('class', 'header');

                        if (sortAscending) {
                            rows.sort(function(a, b) { return b[d] < a[d]; });
                            sortAscending = false;
                            this.className = 'aes';
                        } else {
                            rows.sort(function(a, b) { return b[d] > a[d]; });
                            sortAscending = true;
                            this.className = 'des';
                        }
                    });

    var rows = table.append('tbody').selectAll('tr')
                    .data(data).enter()
                    .append('tr');
    rows.on('click', function (d) {
        if (this.id == 'selectedRow') {
            rows.attr('class', 'row');
            rows.attr('id', null);
            hideSequences();
        }
        else {
            rows.attr('class', 'row');
            rows.attr('id', null);
            this.className = 'selectedRow';
            this.id = 'selectedRow';
            showSequence(d["Id"]);
        }
    });
    rows.selectAll('td')
      .data(function (d) {
          return titles.map(function (k) {
              return { 'value': d[k], 'name': k};
          });
      }).enter()
      .append('td')
      .attr('data-th', function (d) {
          return d.name;
      })
      .text(function (d) {
          return d.value;
      });

    document.onkeydown = function(e) {
        switch (e.keyCode) {
            case 38: // up
                e.view.event.preventDefault();
                rows.attr('class', 'row');
                rows.attr('id', null);
                currentSequence -= 1;
                currentSequence = Math.max(-1, currentSequence);
                if (currentSequence >= 0) {
                    var el = rows.filter(function(d) { return d.Id === currentSequence; })
                    el.node().className = 'selectedRow';
                    el.node().id = 'selectedRow';
                    showSequence(currentSequence);
                }
                else {
                    hideSequences();
                }
                break;
            case 40: // down
                e.view.event.preventDefault();
                rows.attr('class', 'row');
                rows.attr('id', null);
                currentSequence += 1;
                currentSequence = Math.min(currentSequence, data.length - 1);
                var el = rows.filter(function(d) { return d.Id === currentSequence; });
                el.node().className = 'selectedRow';
                el.node().id = 'selectedRow';
                showSequence(currentSequence);
                break;
            case 27: // esc
                e.view.event.preventDefault();
                rows.attr('class', 'row');
                rows.attr('id', null);
                hideSequences();
                break;
        }
    };
}
