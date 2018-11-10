import 'dart:html';
import 'dart:async';

Element fetchBloc(String category) {
  return querySelector('.bloc-time.$category');
}

int getInitialTimeValue(String category) {
  return int.parse(fetchBloc(category).attributes['data-init-value']);
}

void setInitialTimeValue(String category, int value) {
  fetchBloc(category).attributes['data-init-value'] = value.toString();
}

int timeToSeconds(int hours, int minutes, int seconds) {
  return hours * 60 * 60 + minutes * 60 + seconds;
}

void animateBlocDigit(Element digit, String newValue) {
  Element digitTop = digit.querySelector('.top');
  Element digitBottom = digit.querySelector('.bottom');
  Element digitBackTop = digit.querySelector('.top-back');
  Element digitBackBottom = digit.querySelector('.bottom-back');

  // Set the back to the new value
  digitBackTop.text = newValue;
  digitBackBottom.text = newValue;

  // Animate the old value in front to the new value in back
  //digitTop.animate([{"rotateX": 0}, {"rotateX": 180}], 1200);
  digitTop.text = newValue;
  //digitBottom.animate([{"opacity": 75}, {"opacity": 0}], 200);
  digitBottom.text = newValue;
}

void updateBloc(category, int newValue) {
  // figure out the diff of bloc digit values
  // only run the animation on bloc digit that have changed (to avoid all of the elements flickering
  String newDigit1;
  String newDigit2;
  if (newValue >= 10) {
    newDigit1 = newValue.toString()[0];
    newDigit2 = newValue.toString()[1];
  } else {
    newDigit1 = '0';
    newDigit2 = newValue.toString();
  }

  Element digit1 = fetchBloc(category).querySelector('.digit1');
  Element digit2 = fetchBloc(category).querySelector('.digit2');
  if (digit1.querySelector('.top').text != newDigit1) {
    animateBlocDigit(digit1, newDigit1);
  }
  if (digit2.querySelector('.top').text != newDigit2) {
    animateBlocDigit(digit2, newDigit2);
  }
}

void main() {
  int hours = getInitialTimeValue('hours');
  int minutes = getInitialTimeValue('min');
  int seconds = getInitialTimeValue('sec');
  print('The initial time is $hours hours, $minutes minutes, and $seconds seconds');

  int totalSeconds = timeToSeconds(hours, minutes, seconds);
  print('That is $totalSeconds seconds');

  Timer.periodic(Duration(seconds: 1), (timer) {
    if (totalSeconds <= 0) {
      timer.cancel();
    }
    totalSeconds--;

    seconds--;
    if (seconds < 0 && minutes >= 0) {
      seconds = 59;
      minutes--;
    }
    if (minutes < 0 && hours >=0) {
      minutes = 59;
      hours--;
    }

    // Update DOM values
    print('Updating DOM to be $hours:$minutes:$seconds');
    updateBloc('hours', hours);
    updateBloc('min', minutes);
    updateBloc('sec', seconds);
  });
//  var christmas2018 = DateTime(2018, 12, 25);
//  Timer.periodic(Duration(seconds: 1), (_) {
//    var now = DateTime.now();
//    var diff = christmas2018.difference(now);
//    var inMilli = diff.inMilliseconds;
//    var inSeconds = diff.inSeconds;
//
//    var seconds = (inSeconds % 60).floor();
//    var minutes = ((inSeconds / 60) % 60).floor();
//    var hours = ((inMilli / (1000 * 60 * 60)) % 24).floor();
//    var days = (inMilli / (1000 * 60 * 60 * 24)).floor();
//
//  });
}
