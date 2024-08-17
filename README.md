# Dom Dom Factory 🏭

PoV:
You don't want to use a frontend framework because you think it's overkill.
You want to use Vanilla JS to manipulate the DOM,
but then you realize your code gets messy, filled with so many
`document.createElement`, `element.setAttribute`, & `element.appendChild`.
You're considering a **minimal abstraction** with an extremely small bundle size (1.57 KB).

```html
<div id="example-render"></div>

<script>
  const myElement = document.querySelector('#example-render');

  $(myElement, { className: 'bg-yellow-300 rounded my-3 p-3' }, [
    $('div', {}, 'Hello world!'),
    $('ul', { className: 'list-disc pl-5' }, [
      $('li', {}, 'Foo'),
      $('li', {}, ['Bar ', $('b', { className: 'font-bold' }, 'Baz')]),
    ]),
  ]);
</script>
```

More info 👉 https://afiiif.github.io/dom-dom-factory/
