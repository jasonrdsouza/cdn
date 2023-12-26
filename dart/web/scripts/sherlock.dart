import 'dart:html';
import 'dart:math';

void main() async {
  print("The game is afoot!");

  SpanElement titleElement = querySelector('#title') as SpanElement;
  DivElement articleContainer = querySelector('#article-container') as DivElement;

  Iterable<String> storyData = await fetchStory(chooseStory());
  List<String> story = normalizeStory(storyData);
  titleElement.text = story.removeAt(0);

  List<Element> storyElements = List.empty(growable: true);
  for (final line in story) {
    if (isPartHeading(line)) {
      var heading = HeadingElement.h2();
      heading.text = line;
      storyElements.add(heading);
    } else if (isChapterHeading(line)) {
      var heading = HeadingElement.h3();
      heading.text = line;
      storyElements.add(heading);
    } else if (isSectionHeading(line)) {
      var heading = HeadingElement.h3();
      heading.text = line;
      storyElements.add(heading);
    } else {
      var paragraph = new ParagraphElement();
      paragraph.text = line;
      storyElements.add(paragraph);
    }
  }
  articleContainer.children.addAll(storyElements);
}

final String URL_STORY_KEY = "story";

final Map<String, String> stories = {
  "StudyInScarlet": "001_Study_in_Scarlet.txt",
  "SignOfFour": "002_Sign_of_Four.txt",
  "ScandalInBohemia": "003_ASH_01_Scandal_In_Bohemia.txt",
  "RedHeadedLeague": "004_ASH_02_Red_Headed_League.txt",
  "CaseOfIdentity": "005_ASH_03_Case_Of_Identity.txt",
  "BoscombeValleyMystery": "006_ASH_04_Boscombe_Valley_Mystery.txt",
  "FiveOrangePips": "007_ASH_05_Five_Orange_Pips.txt",
  "ManWithTwistedLip": "008_ASH_06_Man_With_Twisted_Lip.txt",
  "BlueCarbuncle": "009_ASH_07_Blue_Carbuncle.txt",
  "SpeckledBand": "010_ASH_08_Speckled_Band.txt",
  "EngineersThumb": "011_ASH_09_Engineers_Thumb.txt",
  "NobleBachelor": "012_ASH_10_Noble_Bachelor.txt",
  "BerylCoronet": "013_ASH_11_Beryl_Coronet.txt",
  "CopperBeeches": "014_ASH_12_Copper_Beeches.txt",
  "SilverBlaze": "015_MSH_01_Silver_Blaze.txt",
  "CardboardBox": "016_MSH_02_Cardboard_Box.txt",
  "YellowFace": "017_MSH_03_Yellow_Face.txt",
  "StockbrokersClerk": "018_MSH_04_Stockbrokers_Clerk.txt",
  "GloriaScott": "019_MSH_05_Gloria_Scott.txt",
  "MusgraveRitual": "020_MSH_06_Musgrave_Ritual.txt",
  "ReigateSquire": "021_MSH_07_Reigate_Squire.txt",
  "CrookedMan": "022_MSH_08_Crooked_Man.txt",
  "ResidentPatient": "023_MSH_09_Resident_Patient.txt",
  "GreekInterpreter": "024_MSH_10_Greek_Interpreter.txt",
  "NavalTreaty": "025_MSH_11_Naval_Treaty.txt",
  "FinalProblem": "026_MSH_12_Final_Problem.txt",
  "HoundOfBaskervilles": "028_Hound_of_theBaskervilles.txt",
  "EmptyHouse": "029_RSH_01_Empty_House.txt",
  "NorwoodBuilder": "030_RSH_02_Norwood_Builder.txt",
  "DancingMen": "031_RSH_03_Dancing_Men.txt",
  "SolitaryCyclist": "032_RSH_04_Solitary_Cyclist.txt",
  "PriorySchool": "033_RSH_05_Priory_School.txt",
  "BlackPeter": "034_RSH_06_Black_Peter.txt",
  "CharlesAugustusMilverton": "035_RSH_07_Charles_Augustus_Milverton.txt",
  "SixNapoleons": "036_RSH_08_Six_Napoleons.txt",
  "ThreeStudents": "037_RSH_09_Three_Students.txt",
  "GoldenPinceNez": "038_RSH_10_Golden_PinceNez.txt",
  "MissingThreeQuarter": "039_RSH_11_Missing_Three_Quarter.txt",
  "AbbeyGrange": "040_RSH_12_Abbey_Grange.txt",
  "SecondStain": "041_RSH_13_Second_Stain.txt",
  "WisteriaLodge": "042_HLB_1_Wisteria_Lodge_MULTIPART.txt",
  "BrucePartingtonPlans": "043_HLB_2_Bruce_Partington_Plans.txt",
  "DevilsFoot": "044_HLB_3_Devil's_Foot.txt",
  "RedCircle": "045_HLB_4_Red_Circle.txt",
  "DisappearanceLadyFrancesCarfax": "046_HLB_5_Disappearance_Lady_Frances_Carfax.txt",
  "DyingDetective": "047_HLB_6_Dying_Detective.txt",
  "ValleyOfFear": "048_Valley_of_Fear.txt",
  "HisLastBow": "049_HLB_7_His_Last_Bow.txt",
  "MazarinStone": "050_CBSH_1_Mazarin_Stone.txt",
  "ThorBridge": "051_CBSH_2_Thor_Bridge.txt",
  "CreepingMan": "052_CBSH_3_Creeping_Man.txt",
};

String chooseStory() {
  String? userSpecifiedStory = Uri.base.queryParameters[URL_STORY_KEY];
  if (userSpecifiedStory != null && stories.containsKey(userSpecifiedStory)) {
    return stories[userSpecifiedStory]!;
  }

  // otherwise, choose a story randomly
  var randomKey = stories.keys.toList()[Random().nextInt(stories.length)];
  setStoryUrlSlug(randomKey);
  return stories[randomKey]!;
}

void setStoryUrlSlug(String slug) {
  window.history.replaceState('', '', '?${URL_STORY_KEY}=${slug}');
}

Future<Iterable<String>> fetchStory(String storyPath) {
  Future<String> rawDictionary = HttpRequest.getString("assets/sherlock/${storyPath}");
  return rawDictionary.then((s) => s.split("\n"));
}

List<String> normalizeStory(Iterable<String> story) {
  return story.toList();
}

bool isPartHeading(String line) {
  var regExp = RegExp(r'^PART ([0-9]+):');
  return regExp.hasMatch(line);
}

bool isChapterHeading(String line) {
  var regExp = RegExp(r'^Chapter ([0-9]+)--');
  return regExp.hasMatch(line);
}

bool isSectionHeading(String line) {
  var regExp = RegExp(r'^([0-9]+)\.');
  return regExp.hasMatch(line);
}
