#  whatJs 💥💥💥 absurdly small and powerful 💥💥💥 javascript framework


<div align="center" text-align="center">
    <span>See my website (completely coded in what)</span>
  <table>
    <tbody>
      <tr>
        <td>
          <a href="">website</a>
        </td>
        <td>
          <a href="">Tutorial</a>
        </td>
        <td>
          <a href="">Fully built website examples</a>
        </td>
        <td>
          <a href="">whatJs playground</a>
        </td>
      </tr>
    </tbody>
  </table>
</div>

# Contents
 - [WhatJs]()
    - [What](#whatisthis)
    - [Why](#whyusethis)
    - [How](#howtouse)
 - [Tutorial](#tutorial) 




whatJs is a proxy based javascript framework I built to facilitate react-like development without what I consider to be the main pain points of react


## Why use this<a name="whyusethis"></a>
whatJs is extremely small coming in under 2kb, vs the react equivalent (react + react-dom) 44.4kb as of 6/27/2024
whatJs can be used inside or with any other javascript library/framework where you can access the DOM (including react)
whatJs is easy to write and understand, without needing to change the way you code
wh

## Examples
<details>
  <summary><strong>Github</strong></summary>
  This section walks through building this page you are currently on (github.com) in whatJs
 
  <div style="margin:10px 0">Lets write components for the different parts of the header.</div>
  <img style="margin-bottom: 10px" src="examples/github/what/header.png">
  <div>1. LinkNav -> Group of links: vertical navigation, dashboard, user, repository</div>
  <div>2. SearchNav -> Search feature</div>
  <div>3. ActionNav -> Action buttons</div>
  <div>4. PageNav -> Page navigation</div>
  <div>5. VertNav -> Vertical navigation<div>

  <div style="margin:10px">
  css:
  #link-nav {
    flex: 1 1 auto;
      display: flex;
      gap: var(--base-size-8, 8px);
  }
  <details>
  <summary>Core App Structure</summary>


    function LinkNav() {

      return dom.div({id: 'link-nav'}, [
        dom.div({id: 'vert-nav-link'}, [

        ]),
        dom.div({id: 'dashboard-link'}, [

        ])
      ])
    }

    function SearchNav() {

      return dom.div();
    }

    function ActionNav() {

      return dom.div();
    }

    function PageNav() {

      return dom.div();
    }

    function VertNav() {

      return dom.div();
    }

    dom.div({render: 'body', id: 'header'},[
      LinkNav(),
      dom.SearchNav(),
      dom.ActionNav(),
      dom.PageNav(),
      dom.VertNav()
    ])
  </details>
  </div>
</details>