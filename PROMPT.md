# Magazine CMS

This CMS will build static HTML pages for a magazine-style publication. These publications will not generally be updated after they are built. They will be heavily cached PWAs. Once installed they will be available offline: images, videos, styles, content, and everything else. A single HTML file should be used per publication. 

The pages of the HTML file should be swipeable on a tablet or phone. These are the motion mappings: up and down should switch sections, left and right should switch pages within a section.

The CMS should generate HTML files that are primarily HTML and CSS. JavaScript can be used sparingly if needed, but it should be standalone and not rely on any external libraries or frameworks.

The files should support features like edge to edge display with photo backgrounds. The default orientation should be landscape. When using background photos, there should be alt text and a description of the photo that is available to screen readers, but not visible to users. There should be a way to add text over the photo.

There should not be support for dark mode. Each page can have a different background, different font colors, and different font sizes. 

