import 'dart:html';
import 'dart:async';
import "package:googleapis_auth/auth_browser.dart" as auth;
import "package:googleapis/people/v1.dart" as people;

final scopes = [people.PeopleApi.ContactsReadonlyScope];
final identifier = new auth.ClientId("606237790871-enqnbeu5qtbakbba0hleoph7umfe93s5.apps.googleusercontent.com", null);
var loginPrompt = querySelector('#login-prompt');
var contactsSection = querySelector('#contacts-section');
final defaultPhotoUri = "hooggaa_logo.png";

void main() {
  window.console.debug('Initializing script');

  // Start with visible login prompt and hidden contacts list
  loginPrompt.hidden = false;
  contactsSection.hidden = true;

  FormElement loginForm = querySelector('#google-login');
  loginForm.onSubmit.listen(promptForAuthentication);
}

void promptForAuthentication(Event e) {
  e.preventDefault();
  auth.createImplicitBrowserFlow(identifier, scopes)
    .then((auth.BrowserOAuth2Flow flow) {
      flow.clientViaUserConsent()
        .then((auth.AuthClient client) {
          window.console.info("Successfully authenticated user");
          loginPrompt.hidden = true;
          contactsSection.hidden = false;

          Future<List<people.Person>> contactsFuture = pullContacts(client);
          contactsFuture.then((contacts) {
            displayContacts(contacts);
          });

          //client.close();
          //flow.close();
        });
    });
}

void displayContacts(List<people.Person> contacts) {
  UListElement contactsList = querySelector('#contacts-list');

  for (var contact in contacts) {
    window.console.debug(contact.toJson());

    LIElement contactNode = new LIElement();
    contactNode.classes.add('collection-item');
    contactNode.classes.add('avatar');
    var contactNodePhoto = new Element.img();
    contactNodePhoto.classes.add('circle');
    var photoUri = contact.photos == null ? defaultPhotoUri : contact.photos[0].url;
    contactNodePhoto.attributes['src'] = photoUri;
    contactNode.children.add(contactNodePhoto);
    var contactNodeTitle = new Element.span();
    contactNodeTitle.classes.add('title');
    contactNodeTitle.text = contact.names == null ? "" : contact.names[0].displayName;
    contactNode.children.add(contactNodeTitle);
    var contactNodeInfo = new Element.p();
    var emailAddress = contact.emailAddresses == null ? "" : contact.emailAddresses[0].value;
    var phoneNumber = contact.phoneNumbers == null ? "" : contact.phoneNumbers[0].value;
    contactNodeInfo.innerHtml = '$emailAddress<br>$phoneNumber';
    contactNode.children.add(contactNodeInfo);
    var contactNodeSelection = new Element.div();
    contactNodeSelection.classes.add('switch');
    contactNodeSelection.classes.add('secondary-content');
    contactNodeSelection.innerHtml = '<label><input type="checkbox"><span class="lever"></span></label>';
    contactNode.children.add(contactNodeSelection);

    contactsList.children.add(contactNode);
  }
}

Future<List<people.Person>> pullContacts(auth.AuthClient client) {
  var peopleApi = new people.PeopleApi(client);

  // fetch the logged in users connections
  return (peopleApi.people.connections.list('people/me', requestMask_includeField: 'person.names,person.photos,person.emailAddresses,person.phoneNumbers', sortOrder: "FIRST_NAME_ASCENDING", pageSize: 1000) // Todo: turn this into a final list above
    .then((people.ListConnectionsResponse connectionsResponse) {
      return connectionsResponse.connections;
    }));
}

