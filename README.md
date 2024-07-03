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
### Github
This section walks through building this page you are currently on (github.com) in whatJs

<details>
  <summary><strong>Building the header</strong></summary>
 
  <div style="margin:10px 0">Lets write components for the different parts of the header.</div>
  <img style="margin-bottom: 10px" src="examples/github/what/header.png">
  <div>1. LinkNav -> Group of links: vertical navigation, dashboard, user, repository</div>
  <div>2. SearchNav -> Search feature</div>
  <div>3. ActionNav -> Action buttons</div>
  <div>4. PageNav -> Page navigation</div>
  <div>5. VertNav -> Vertical navigation<div>

  <div style="margin:20px">
  <details>
  <summary>Core App Structure</summary>


    /**
        Divide out our different logical header sections into their own component. Any function is valid as a whatJs component As long as it returns
        a valid HTML Element when called. Register with dom.register(componentName)
    */
    function LinkNav() {
      return dom.div({id: 'links'}, 'links')
    }

    // Arrow syntx works, as does passing arguments.
    let SearchNav = (name='search') => dom.div({id: name}, name');

    // Register components inline.
    dom.register(function ActionNav() {
      return dom.div({id: 'actions'}, 'actions)
    });

    let PageNav = () => Search('pages');

    // We can hard code elements as well, we then just dont register then with whatJs and just insert inline like below
    let VertNav = dom.div({id: 'vert'});

    // note we dont need to pass Actions as it was registered inline
    dom.register([LinkNav, SearchNav, PageNav]);

    // create any dom element while supplying a render target to create the element and render it there
    dom.div({render: 'body', id: 'header'},[
      dom.LinkNav(),
      dom.SearchNav(),
      dom.ActionNav(),
      dom.PageNav(),
      VertNav
    ])
  </details>
  </div>



  <details>
    <summary>Nested Code</summary>

    ```
    CODE!
    ```
  </details>
</details>
## Specification
Example text blah. Example text blah. Example text blah. Example text blah. 
Example text blah. Example text blah. Example text blah. Example text blah. 
Example text blah. Example text blah. Example text blah. Example text blah. 
Example text blah. Example text blah. 

## Dependencies Title
Example text blah. Example text blah. Example text blah. Example text blah. 
Example text blah. Example text blah. Example text blah. Example text blah. 
Example text blah. Example text blah. Example text blah. Example text blah. 
Example text blah. Example text blah.