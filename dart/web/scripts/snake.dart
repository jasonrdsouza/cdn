import 'dart:html';
import 'dart:math';
import 'dart:collection';
import 'dart:async';

const int CELL_SIZE = 10;
Keyboard keyboard = new Keyboard();
late CanvasElement canvas;
late CanvasRenderingContext2D ctx;

void main() {
  canvas = querySelector('#canvas') as CanvasElement;
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  print("Starting Snake Engine");
  new Game().run();
}

void drawCell(Point coords, String color) {
  ctx
    ..fillStyle = color
    ..strokeStyle = "white";

  final int x = coords.x.toInt() * CELL_SIZE;
  final int y = coords.y.toInt() * CELL_SIZE;

  ctx
    ..fillRect(x, y, CELL_SIZE, CELL_SIZE)
    ..strokeRect(x, y, CELL_SIZE, CELL_SIZE);
}

void clear() {
  ctx
    ..fillStyle = "white"
    ..fillRect(0, 0, canvas.width!, canvas.height!);
}

class Keyboard {
  HashMap<int, num> keys = new HashMap<int, num>();

  Keyboard() {
    window.onKeyDown.listen((KeyboardEvent event) {
      keys.putIfAbsent(event.keyCode, () => event.timeStamp!);
    });

    window.onKeyUp.listen((KeyboardEvent event) {
      keys.remove(event.keyCode);
    });
  }

  bool isPressed(int keyCode) => keys.containsKey(keyCode);
}

class Snake {
  // directions
  static const Point LEFT = const Point(-1, 0);
  static const Point RIGHT = const Point(1, 0);
  static const Point UP = const Point(0, -1);
  static const Point DOWN = const Point(0, 1);

  static const int START_LENGTH = 6;

  // coordinates of the body segments
  late List<Point> body;
  // current travel direction
  Point currentDir = RIGHT;

  Snake() {
    int i = START_LENGTH - 1;
    body = new List<Point>.generate(START_LENGTH, (int index) => new Point(i--, 0));
  }

  Point get head => body.first;

  void checkInput() {
    // and disallow 180 degree turns
    if (keyboard.isPressed(KeyCode.LEFT) && currentDir != RIGHT) {
      currentDir = LEFT;
    } else if (keyboard.isPressed(KeyCode.RIGHT) && currentDir != LEFT) {
      currentDir = RIGHT;
    } else if (keyboard.isPressed(KeyCode.UP) && currentDir != DOWN) {
      currentDir = UP;
    } else if (keyboard.isPressed(KeyCode.DOWN) && currentDir != UP) {
      currentDir = DOWN;
    }
  }

  void grow() {
    // add new head based on current direction
    body.insert(0, head + currentDir);
  }

  void move() {
    // instead of moving every body segment, add 1 to the front and remove 1 from the back
    grow();
    body.removeLast();
  }

  void draw() {
    // starting with the head, draw each body segment
    for (Point p in body) {
      drawCell(p, "green");
    }
  }

  bool bodyCollision() {
    for (Point p in body.skip(1)) {
      if (p == head) {
        return true;
      }
    }

    return false;
  }

  void update() {
    checkInput();
    move();
    draw();
  }
}

class Game {
  // smaller numbers make the game run faster
  static const num GAME_SPEED = 50;

  num lastTimestamp = 0;
  int rightEdgeX;
  int bottomEdgeY;

  late Snake snake;
  late Point food;

  Game()
      : rightEdgeX = canvas.width! ~/ CELL_SIZE,
        bottomEdgeY = canvas.height! ~/ CELL_SIZE {
    init();
  }

  void init() {
    snake = new Snake();
    food = randomPoint();
  }

  Point randomPoint() {
    Random random = new Random();
    return new Point(random.nextInt(rightEdgeX), random.nextInt(bottomEdgeY));
  }

  void checkForCollisions() {
    // check for collision with food
    if (snake.head == food) {
      snake.grow();
      food = randomPoint();
    }

    // check death conditions
    if (snake.head.x < 0 ||
        snake.head.x >= rightEdgeX ||
        snake.head.y < 0 ||
        snake.head.y >= bottomEdgeY ||
        snake.bodyCollision()) {
      init();
    }
  }

  Future run() async {
    update(await window.animationFrame);
  }

  void update(num delta) {
    final num diff = delta - lastTimestamp;

    if (diff > GAME_SPEED) {
      lastTimestamp = delta;
      clear();
      drawCell(food, "blue");
      snake.update();
      checkForCollisions();
    }

    // keep looping
    run();
  }
}
