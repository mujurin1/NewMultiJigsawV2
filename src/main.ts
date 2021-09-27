import { PieceScene } from "./PieceScene";
import { GameParams } from "./params";
import { PieceServer } from "./PieceServer";


function main(args: g.GameMainParameterObject): void {
  GameParams.init();

  if (GameParams.operation == "atsumaru") {
    GameParams.liverId = g.game.selfId;
    g.game.pushScene(start());
  } else {
    // 一度空のシーンを読み込み、生主がJoinしてから、本シーンを読み込む
    const emptyScene = new g.Scene({ game: g.game });
    g.game.onJoin.addOnce(e => {
      GameParams.liverId = e.player.id;
      g.game.replaceScene(start());
    });
    g.game.pushScene(emptyScene);
  }
}

function start(): g.Scene {
  const scene = new PieceScene({
    game: g.game,
    assetIds: ["joinBtn", "playBtn", "left", "right",
      "setting", "zoomIn", "zoomOut", "previewBtn", "titleBtn", "infoBtn", "visibleBtn",
      "result", "resultBtn", "crown_0", "crown_1", "crown_2", "crown_3",
      "select_E", "select_N", "select_H", "sanka_nin", "title_back",
      "fit", "fit2",
      "voice_top", "voice_left", "voice_right", "voice_bottom", "voice_outer",
      "voice_25", "voice_50", "voice_75", "voice_8888"
    ],
    assetPaths: ["/assets/**/*"],
  });
  GameParams.setAsset(scene);
  if (GameParams.isServer) {
    g.game.vars.server = new PieceServer({ scene });
  }
  return scene;
}

export = main;
