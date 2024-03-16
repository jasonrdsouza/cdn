import 'dart:html';
import 'dart:async';

const TRUE_TIME_PARAM = 't';
const ALLOWABLE_SECONDS_DRIFT = 5;

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
  Element digitTop = digit.querySelector('.top')!;
  Element digitBottom = digit.querySelector('.bottom')!;
  Element digitBackTop = digit.querySelector('.top-back')!;
  Element digitBackBottom = digit.querySelector('.bottom-back')!;

  digitBackTop.text = newValue;
  digitBottom.text = newValue;
  digitTop
      .animate([
        {"transform": "rotateX(0deg)"},
        {"transform": "rotateX(90deg)"}
      ], {
        "duration": 300,
        "fill": "both"
      })
      .finished
      .then((value) {
        digitBottom
            .animate([
              {"transform": "rotateX(-90deg)"},
              {"transform": "rotateX(0deg)"}
            ], {
              "duration": 300,
              "fill": "backwards"
            })
            .finished
            .then((value) {
              digitBackBottom.text = newValue;
              digitTop.text = newValue;
            });
      });
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
  if (digit1.querySelector('.top-back')!.text != newDigit1) {
    animateBlocDigit(digit1, newDigit1);
  }
  if (digit2.querySelector('.top-back')!.text != newDigit2) {
    animateBlocDigit(digit2, newDigit2);
  }
}

String padTime(int timeValue) {
  return timeValue.toString().padLeft(2, '0');
}

int trueElapsedSeconds(DateTime startTime) {
  return DateTime.now().difference(startTime).inSeconds;
}

bool timeDilationDetected(DateTime startTime, int elapsedSeconds) {
  if (Uri.base.queryParameters.containsKey(TRUE_TIME_PARAM) && Uri.base.queryParameters[TRUE_TIME_PARAM] == '1') {
    return (trueElapsedSeconds(startTime) - elapsedSeconds).abs() > ALLOWABLE_SECONDS_DRIFT;
  }

  // otherwise, allow background tab throttling to artificially extend the Pomodoro session
  return false;
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

  var startTime = DateTime.now();
  var elapsedSeconds = 1;

  if (totalSeconds > 0) {
    Timer.periodic(Duration(seconds: 1), (timer) {
      if (elapsedSeconds >= totalSeconds) {
        timer.cancel();
      }
      elapsedSeconds++;

      if (timeDilationDetected(startTime, elapsedSeconds)) {
        print('Time dilation detected... fixing');
        elapsedSeconds = trueElapsedSeconds(startTime);
        var normalizedTime = normalizeTime(totalSeconds - elapsedSeconds);
        hours = normalizedTime[0];
        minutes = normalizedTime[1];
        seconds = normalizedTime[2];
      } else {
        seconds--;
        if (seconds < 0 && minutes >= 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0 && hours >= 0) {
          minutes = 59;
          hours--;
        }
      }

      // Update DOM values
      print('Updating DOM to be ${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}');
      updateBloc('hours', hours);
      updateBloc('min', minutes);
      updateBloc('sec', seconds);
    });
  }
}
