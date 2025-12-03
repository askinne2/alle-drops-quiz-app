---
title: Building metafield writes into extensions
description: Learn how to write to metafields from a customer account UI extension.
source_url:
  html: 'https://shopify.dev/docs/apps/build/customer-accounts/metafields'
  md: 'https://shopify.dev/docs/apps/build/customer-accounts/metafields.md'
---

# Building metafield writes into extensions

Writing to metafields directly from the [Customer Account API](https://shopify.dev/docs/api/customer) enables you to store additional information about customers within Shopify, without making a separate call to the [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql), a third-party server, or other external resource.

In this tutorial, you'll create a customer account UI extension for the **Profile** page, to enable a merchant to collect a customer’s preferred nickname and pass that input into a metafield.

## Limitations

Metafield writes are only supported on the [`Customer`](https://shopify.dev/docs/api/customer/latest/objects/Customer), [`Order`](https://shopify.dev/docs/api/customer/latest/objects/Order), [`Company`](https://shopify.dev/docs/api/customer/latest/objects/Company), and [`CompanyLocation`](https://shopify.dev/docs/api/customer/latest/objects/CompanyLocation) objects. Metafield writes are available as of the `2024-07` version of the Customer Account API.

## What you'll learn

In this tutorial, you'll learn how to do the following tasks:

* Use TOML declarative custom data definitions to configure a metafield definition with permissions to read and write to metafields using the [Customer Account API](https://shopify.dev/docs/api/customer).
* Create an extension that's rendered on the customer account **Profile** page.
* Use the Customer Account API to write data to a metafield.

## Requirements

[Create a Partner account](https://www.shopify.com/partners)

[Create a development store](https://shopify.dev/docs/apps/tools/development-stores)

The development store should be pre-populated with [test data](https://shopify.dev/docs/api/development-stores/generated-test-data), including an order associated with the email address you'll use to log in to the customer account experience.

[Shopify CLI](https://shopify.dev/docs/apps/tools/cli/installation)

You'll need to use the [latest version of Shopify CLI](https://shopify.dev/docs/api/shopify-cli#upgrade).

[Scaffold an app](https://shopify.dev/docs/apps/build/scaffold-app)

Scaffold an app that uses Shopify CLI.

[Request access to Protected Customer Data](https://shopify.dev/docs/apps/launch/protected-customer-data)

The Customer Account API requires access to Level 1 Protected Customer Data. [Request access](https://shopify.dev/docs/apps/launch/protected-customer-data#request-access-to-protected-customer-data) for your app.

## Project

[View on GitHub](https://github.com/Shopify/customer-account-tutorials/tree/main/preact/example-customer-account--metafields--preact)

### Create a customer account UI extension

To create a customer account UI extension, you can use Shopify CLI, which generates starter code for building your extension and automates common development tasks.

1. Navigate to your app directory:

   ## Terminal

   ```terminal
   cd <directory>
   ```

2. Run the following command to create a new customer account UI extension:

   ## Terminal

   ```terminal
   shopify app generate extension --template customer_account_ui --name customer-account-ui-extension
   ```

   You should now have a new extension directory in your app's directory. The extension directory includes the extension script at `src/{FileName}.jsx`. The following is an example directory structure:

   ## Customer account UI extension file structure

   ```text
   └── my-app
   └── extensions
         └── my-customer-account-ui-extension
             ├── src
             │   └── CustomerAccount.jsx // The index page of the customer account UI extension
             ├── locales
             │   ├── en.default.json // The default locale for the customer account UI extension
             │   └── fr.json // The locale file for non-regional French translations
             ├── shopify.extension.toml // The config file for the customer account UI extension
             └── package.json
   ```

1) Start your development server to build and preview your app:

   ## Terminal

   ```terminal
   shopify app dev
   ```

   To learn about the processes that are executed when you run `dev`, refer to the [Shopify CLI command reference](https://shopify.dev/docs/api/shopify-cli/app/app-dev).

2) Press `p` to open the developer console. In the developer console page, click on the preview link for your extension.

### Configure access scopes for your app

To read or write metafield data on the `CUSTOMER` resource using the Customer Account API, you'll need to include the `customer_read_customers` and `customer_write_customers` [access scopes](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration#access_scopes) in your app's `shopify.app.toml` file.

## /preact/example-customer-account--metafields--preact/shopify.app.toml

```toml
name = "ca-metafields"
application_url = "https://shopify.dev/apps/default-app-home"
embedded = true


[build]
automatically_update_urls_on_dev = true
include_config_on_deploy = true


[webhooks]
api_version = "2025-10"


[access_scopes]
scopes = "write_customers, customer_write_customers"


[auth]
redirect_urls = [ "https://shopify.dev/apps/default-app-home/api/auth" ]


[customer.metafields.app.nickname]
type = "single_line_text_field"
name = "The customer's preferred name"
description = "The customer's preferred nickname for personalization"
access.customer_account = "read_write"
access.admin = "merchant_read"
```

### Create the metafield definition

Use a [declarative custom data definition](https://shopify.dev/docs/apps/build/custom-data/declarative-custom-data-definitions) to configure metafield definitions directly in your app's configuration file.

In your app's `shopify.app.toml` file, add a `[customer.metafields.app.nickname]` section to define the metafield:

This creates a metafield to store customer nickname preferences, allowing customers to personalize their account information through your extension.

## /preact/example-customer-account--metafields--preact/shopify.app.toml

```toml
name = "ca-metafields"
application_url = "https://shopify.dev/apps/default-app-home"
embedded = true


[build]
automatically_update_urls_on_dev = true
include_config_on_deploy = true


[webhooks]
api_version = "2025-10"


[access_scopes]
scopes = "write_customers, customer_write_customers"


[auth]
redirect_urls = [ "https://shopify.dev/apps/default-app-home/api/auth" ]


[customer.metafields.app.nickname]
type = "single_line_text_field"
name = "The customer's preferred name"
description = "The customer's preferred nickname for personalization"
access.customer_account = "read_write"
access.admin = "merchant_read"
```

### Set up the targets for your extension

Set up the targets for your customer account UI extension. [Extension targets](https://shopify.dev/docs/api/customer-account-ui-extensions/targets) control where your extension renders in the customer account flow.

You'll use a [block extension target](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/extension-targets-overview#block-extension-targets) to render a card on the **Profile** page and to render a modal when the button is clicked.

#### Reference the extension targets in your configuration file

This example code uses the [`customer-account.profile.block.render`](https://shopify.dev/docs/api/customer-account-ui-extensions/targets/profile-\(default\)/customer-account-profile-block-render) extension target.

In your extension's [`shopify.extension.toml`](https://shopify.dev/docs/apps/build/app-extensions/configure-app-extensions) configuration file, create an `[[extensions.targeting]]` section with the `target`, an identifier that specifies where you're injecting code into Shopify, and `module`, the path to the file that contains the extension code.

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/shopify.extension.toml

```toml
api_version = "2025-10"


[[extensions]]
name = "customer-preferences"
handle = "customer-preferences"
uid = "e0260bd4-f328-fedf-994f-bfeb7e42f14a9089f017"
type = "ui_extension"


[[extensions.targeting]]
module = "./src/ProfilePreferenceExtension.jsx"
target = "customer-account.profile.block.render"
```

#### Create files for your targets

Create files in your extension's `src` directory for each of your targets.

In this example, you'll create a file for the **Profile** page extension. The filenames must match the `module` paths you specified.

### Build the customer account UI extension for the **Profile** page

Use [Polaris web components](https://shopify.dev/docs/api/customer-account-ui-extensions/polaris-web-components) to build the UI of your extension.

In this example, a new [`s-section`](https://shopify.dev/docs/api/customer-account-ui-extensions/polaris-web-components/structure/section) component is added to the **Profile** page. The section displays the current nickname. An [`s-link`](https://shopify.dev/docs/api/checkout-ui-extensions/polaris-web-components/actions/link) component is rendered that opens an [`s-modal`](https://shopify.dev/docs/api/checkout-ui-extensions/polaris-web-components/overlays/modal) component where a customer can update their nickname. The modal contains an [`s-text-field`](https://shopify.dev/docs/api/checkout-ui-extensions/polaris-web-components/forms/textfield) component where the user can input their new nickname.

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/src/ProfilePreferenceExtension.jsx

```jsx
// @ts-nocheck
import {render} from 'preact';
import {useState, useRef} from 'preact/hooks';


export default async () => {
  const {customerId, nickName} = await getCustomerPreferences();


  render(
    <ProfilePreferenceExtension customerId={customerId} nickName={nickName} />,
    document.body
  );
};


function ProfilePreferenceExtension(props) {
  const {i18n} = shopify;
  const modalRef = useRef();
  const [loading, setLoading] = useState(false);
  const [nickName, setNickName] = useState(props.nickName ?? '');
  const [newNickName, setNewNickName] = useState(nickName);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatedNickname = await setCustomerPreferences(
      props.customerId,
      newNickName
    );
    setNickName(updatedNickname);
    setLoading(false);
    modalRef.current?.hideOverlay();
  };


  const handleCancel = () => {
    modalRef.current?.hideOverlay();
  };
```

Fetch the customer's nickname metafield value by querying the Customer Account API. Display the returned nickname value in the card.

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/src/ProfilePreferenceExtension.jsx

```jsx
// @ts-nocheck
import {render} from 'preact';
import {useState, useRef} from 'preact/hooks';


export default async () => {
  const {customerId, nickName} = await getCustomerPreferences();


  render(
    <ProfilePreferenceExtension customerId={customerId} nickName={nickName} />,
    document.body
  );
};


function ProfilePreferenceExtension(props) {
  const {i18n} = shopify;
  const modalRef = useRef();
  const [loading, setLoading] = useState(false);
  const [nickName, setNickName] = useState(props.nickName ?? '');
  const [newNickName, setNewNickName] = useState(nickName);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatedNickname = await setCustomerPreferences(
      props.customerId,
      newNickName
    );
    setNickName(updatedNickname);
    setLoading(false);
    modalRef.current?.hideOverlay();
  };


  const handleCancel = () => {
    modalRef.current?.hideOverlay();
  };
```

[Localization](https://shopify.dev/docs/apps/build/customer-accounts/localization) can be used to translate the UI of your extension into multiple languages. In this example, English is the default locale by including `en.default.json` in the `locales`.

In our example, French is also supported by providing an `fr.json` file in the `locales` directory.

### Write the user input to your metafield

Make a request to the [`metafieldsSet`](https://shopify.dev/docs/api/customer/latest/mutations/metafieldsSet) mutation to write the user input to the metafield.

Pass the [previously defined](#create-the-metafield-definition) `key` and `namespace` to the `metafieldsSet` mutation to identify the metafield you want to update. The `ownerId` is the ID of the object whose metafield you want to update. In this example, it is the ID of the current customer. In this case, the `value` is the new nickname that the customer has inputted.

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/src/ProfilePreferenceExtension.jsx

```jsx
// @ts-nocheck
import {render} from 'preact';
import {useState, useRef} from 'preact/hooks';


export default async () => {
  const {customerId, nickName} = await getCustomerPreferences();


  render(
    <ProfilePreferenceExtension customerId={customerId} nickName={nickName} />,
    document.body
  );
};


function ProfilePreferenceExtension(props) {
  const {i18n} = shopify;
  const modalRef = useRef();
  const [loading, setLoading] = useState(false);
  const [nickName, setNickName] = useState(props.nickName ?? '');
  const [newNickName, setNewNickName] = useState(nickName);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatedNickname = await setCustomerPreferences(
      props.customerId,
      newNickName
    );
    setNickName(updatedNickname);
    setLoading(false);
    modalRef.current?.hideOverlay();
  };


  const handleCancel = () => {
    modalRef.current?.hideOverlay();
  };
```

### Preview the extension

Use the Shopify CLI to preview your extension to make sure that it works as expected.

1. In a terminal, navigate to your app directory.

2. Start `app dev` if you haven't already to build and preview your app:

   ```bash
   shopify app dev
   ```

3. If prompted, select a dev store.

4. Once started, press `p` or navigate to the preview link in the developer console.

5. In the developer console page, click the preview link for your extension target.

6. Click the edit icon in the `Preferences` card to open the modal and update the nickname metafield value.

Troubleshooting

##### Extension not rendering

Ensure that your app is installed on the dev store you're testing with.

Check your browser's developer console for any errors that might be preventing the extension from rendering.

##### Metafield not updating

If the metafield value isn't being properly persisted, for example if the value that you specified isn't being saved after a page reload, do the following:

* Ensure that the `namespace` and `key` used to [create the metafield definition](#create-the-metafield-definition) match the values being used in the `metafieldsSet` [mutation](#write-the-user-input-to-your-metafield).
* Check your network traffic for the response to the `metafieldsSet` mutation. The response will contain a `userErrors` field that will provide more information about what went wrong.

### Deploy your extension

When you're ready to release your changes to users, you can create and release an [app version](https://shopify.dev/docs/apps/launch/deployment/app-versions). An app version is a snapshot of your app configuration and all extensions.

1. Navigate to your app directory.

2. Run the following command.

   Optionally, you can provide a name or message for the version using the `--version` and `--message` flags.

   ## Terminal

   ```terminal
   shopify app deploy
   ```

Releasing an app version replaces the current active version that's served to stores that have your app installed. It might take several minutes for app users to be upgraded to the new version.

Tip

If you want to create a version, but avoid releasing it to users, then run the `deploy` command with a `--no-release` flag. You can release the unreleased app version using Shopify CLI's [`release`](https://shopify.dev/docs/api/shopify-cli/app/app-release) command, or through the Dev Dashboard.

## /preact/example-customer-account--metafields--preact/shopify.app.toml

```toml
name = "ca-metafields"
application_url = "https://shopify.dev/apps/default-app-home"
embedded = true


[build]
automatically_update_urls_on_dev = true
include_config_on_deploy = true


[webhooks]
api_version = "2025-10"


[access_scopes]
scopes = "write_customers, customer_write_customers"


[auth]
redirect_urls = [ "https://shopify.dev/apps/default-app-home/api/auth" ]


[customer.metafields.app.nickname]
type = "single_line_text_field"
name = "The customer's preferred name"
description = "The customer's preferred nickname for personalization"
access.customer_account = "read_write"
access.admin = "merchant_read"
```

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/shopify.extension.toml

```toml
api_version = "2025-10"


[[extensions]]
name = "customer-preferences"
handle = "customer-preferences"
uid = "e0260bd4-f328-fedf-994f-bfeb7e42f14a9089f017"
type = "ui_extension"


[[extensions.targeting]]
module = "./src/ProfilePreferenceExtension.jsx"
target = "customer-account.profile.block.render"
```

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/src/ProfilePreferenceExtension.jsx

```jsx
// @ts-nocheck
import {render} from 'preact';
import {useState, useRef} from 'preact/hooks';


export default async () => {
  const {customerId, nickName} = await getCustomerPreferences();


  render(
    <ProfilePreferenceExtension customerId={customerId} nickName={nickName} />,
    document.body
  );
};


function ProfilePreferenceExtension(props) {
  const {i18n} = shopify;
  const modalRef = useRef();
  const [loading, setLoading] = useState(false);
  const [nickName, setNickName] = useState(props.nickName ?? '');
  const [newNickName, setNewNickName] = useState(nickName);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatedNickname = await setCustomerPreferences(
      props.customerId,
      newNickName
    );
    setNickName(updatedNickname);
    setLoading(false);
    modalRef.current?.hideOverlay();
  };


  const handleCancel = () => {
    modalRef.current?.hideOverlay();
  };
```

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/locales/en.default.json

```json
{
  "preferenceCard": {
    "heading": "Preferences",
    "nickName": {
      "label": "Nickname"
    },
    "edit": "Edit",
    "modalHeading": "Edit preferences",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## /preact/example-customer-account--metafields--preact/extensions/customer-preferences/locales/fr.json

```json
{
  "preferenceCard": {
    "heading": "Préférences",
    "nickName": {
      "label": "Surnom"
    },
    "edit": "Modifier",
    "modalHeading": "Modifier les préférences",
    "save": "Sauvegarder",
    "cancel": "Annuler"
  }
}
```

## Tutorial complete!

Nice work - what you just built could be used by Shopify merchants around the world! Keep the momentum going with these related tutorials and resources.

### Next Steps

[Working with metafields\
\
](https://shopify.dev/docs/api/customer/latest/mutations/metafieldsSet)

[Explore methods for adding and storing custom data about a Shopify resource with metafields.](https://shopify.dev/docs/api/customer/latest/mutations/metafieldsSet)

[Extension placement\
\
](https://shopify.dev/docs/apps/customer-accounts/best-practices/deciding-extension-placement)

[Explore extension placement options and make informed decisions on where to position them.](https://shopify.dev/docs/apps/customer-accounts/best-practices/deciding-extension-placement)

[Localize your extension\
\
](https://shopify.dev/docs/apps/customer-accounts/best-practices/localizing-ui-extensions)

[Learn about localizing your customer account UI extensions for international merchants and customers.](https://shopify.dev/docs/apps/customer-accounts/best-practices/localizing-ui-extensions)

[Extension targets\
\
](https://shopify.dev/docs/api/customer-account-ui-extensions/targets)

[Learn about the extension targets offered in customer account.](https://shopify.dev/docs/api/customer-account-ui-extensions/targets)

[Polaris web components\
\
](https://shopify.dev/docs/api/customer-account-ui-extensions/polaris-web-components)

[Learn about the components you can use to build customer account UI extensions.](https://shopify.dev/docs/api/customer-account-ui-extensions/polaris-web-components)

[UX guidelines\
\
](https://shopify.dev/docs/apps/customer-accounts/best-practices/ux-guidelines)

[Follow our UX guidelines for customer accounts to ensure a consistent and satisfying user experience.](https://shopify.dev/docs/apps/customer-accounts/best-practices/ux-guidelines)

[Figma UI kit\
\
](https://www.figma.com/community/file/1554582792754361051)

[Explore Figma components for checkout and account UI extensions.](https://www.figma.com/community/file/1554582792754361051)