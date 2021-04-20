import 'dart:html';
import 'dart:async';

Element fetchBloc(String category) {
  return querySelector('.bloc-time.$category') as Element;
}

int getInitialTimeValue(String category) {
  String? userSupplied = Uri.base.queryParameters[category];
  if (userSupplied != null && int.tryParse(userSupplied) != null) {
    return int.parse(userSupplied);
  }

  return int.parse(fetchBloc(category).attributes['data-init-value']!);
}

void setInitialTimeValue(String category, int value) {
  fetchBloc(category).attributes['data-init-value'] = value.toString();
}

int timeToSeconds(int hours, int minutes, int seconds) {
  return hours * 60 * 60 + minutes * 60 + seconds;
}

List<int> normalizeTime(int totalSeconds) {
  // in case the user inputs values larger than 60 for seconds or minutes
  int hours = (totalSeconds / 3600).floor();
  int minutes = ((totalSeconds % 3600) / 60).floor();
  int seconds = (totalSeconds % 3600) % 60;

  return [hours, minutes, seconds];
}

void animateBlocDigit(Element digit, String newValue) {
  // This is broken and I'm not sure how to fix it. I think
  // I need to figure out a way to order the animation, instead
  // of everything happening at once (which is the default?).
  // Ideally I would update the back cards to the new value,
  // then animate the front card flip, then after the animation is
  // done, update the front cards (which would be transparent to the
  // user). Unfortunately, everything happens at once, so it doesn't
  // look right. Also, the front bottom animation is messed up
  // because it happens simultaneously (again, due to me not being able
  // to order the animation frames) with the front top animation.
  Element digitTop = digit.querySelector('.top')!;
  Element digitBottom = digit.querySelector('.bottom')!;
  Element digitBackTop = digit.querySelector('.top-back')!;
  Element digitBackBottom = digit.querySelector('.bottom-back')!;

  // Set the back to the new value
  digitBackTop.text = newValue;
  digitBackBottom.text = newValue;

  // Animate the old value in front to the new value in back
  Animation animation = digitTop.animate([
    {"transform": "rotateX(0deg)"},
    {"transform": "rotateX(-180deg)"}
  ], {
    "duration": 800,
    "fill": "both"
  });
  digitTop.text = newValue;
  digitBottom.animate([
    {"transform": "rotateX(180deg)"},
    {"transform": "rotatex(0deg)"}
  ], 800);
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

  Element digit1 = fetchBloc(category).querySelector('.digit1')!;
  Element digit2 = fetchBloc(category).querySelector('.digit2')!;
  if (digit1.querySelector('.top')!.text != newDigit1) {
    animateBlocDigit(digit1, newDigit1);
  }
  if (digit2.querySelector('.top')!.text != newDigit2) {
    animateBlocDigit(digit2, newDigit2);
  }
}

String padTime(int timeValue) {
  return timeValue.toString().padLeft(2, '0');
}

void main() {
  int hours = getInitialTimeValue('hours');
  int minutes = getInitialTimeValue('min');
  int seconds = getInitialTimeValue('sec');
  print('The initial time is $hours hours, $minutes minutes, and $seconds seconds');

  int totalSeconds = timeToSeconds(hours, minutes, seconds);
  print('That is $totalSeconds seconds');

  List<int> normalizedTime = normalizeTime(totalSeconds);
  hours = normalizedTime[0];
  minutes = normalizedTime[1];
  seconds = normalizedTime[2];
  print('The normalized time is $hours hours, $minutes minutes, and $seconds seconds');

  if (totalSeconds > 0) {
    Timer.periodic(Duration(seconds: 1), (timer) {
      if (totalSeconds <= 1) {
        timer.cancel();
      }
      totalSeconds--;

      seconds--;
      if (seconds < 0 && minutes >= 0) {
        seconds = 59;
        minutes--;
      }
      if (minutes < 0 && hours >= 0) {
        minutes = 59;
        hours--;
      }

      // Update DOM values
      print('Updating DOM to be ${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}');
      updateBloc('hours', hours);
      updateBloc('min', minutes);
      updateBloc('sec', seconds);
    });
  }
}
