import React, { useState } from "react";
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from "recoil";
import styled from "styled-components";
import { animated, useSpring, useTransition } from "react-spring";

import Player51 from "./Player51";
import Tag from "./Tags/Tag";
import * as atoms from "../recoil/atoms";
import * as selectors from "../recoil/selectors";
import { labelFilters } from "./Filters/LabelFieldFilters.state";
import * as labelAtoms from "./Filters/utils";
import { packageMessage } from "../utils/socket";
import { useVideoData, useTheme } from "../utils/hooks";
import { Checkbox } from "@material-ui/core";
import {
  stringify,
  VALID_CLASS_TYPES,
  VALID_LIST_TYPES,
} from "../utils/labels";

const SampleDiv = animated(styled.div`
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 10px ${({ theme }) => theme.backgroundDark};
  background-color: ${({ theme }) => theme.backgroundDark};
  width: 100%;
`);

const SampleInfoDiv = animated(styled.div`
  height: 36px;
  display: flex;
  position: absolute;
  bottom: 0;
  padding: 0.5rem;
  &::-webkit-scrollbar {
    width: 0px;
    background: transparent;
    display: none;
  }
  &::-webkit-scrollbar-thumb {
    width: 0px;
    display: none;
  }
  scrollbar-width: none;
  overflow-x: scroll;
  width: 100%;
  z-index: 499;
  pointer-events: none;
`);

const LoadingBar = animated(styled.div`
  position: absolute;
  bottom: 0;
  left: 0px;
  width: auto;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.brandFullyTransparent} 0%,
    ${({ theme }) => theme.brand} 50%,
    ${({ theme }) => theme.brandFullyTransparent} 100%
  );
  height: 0.2em;
`);

const useHoverLoad = (socket, sample) => {
  if (sample._media_type !== "video") {
    return [[], (e) => {}, (e) => {}];
  }
  const [barItem, setBarItem] = useState([]);
  const [loaded, setLoaded] = useState(null);
  const viewCounter = useRecoilValue(atoms.viewCounter);

  const [requested, requestLabels] = useVideoData(
    socket,
    sample,
    (data, player) => {
      if (!data) return;
      const { labels } = data;
      setLoaded(viewCounter);
      setBarItem([]);
      player.updateOverlay(labels);
      if (player.isHovering()) player.play();
    }
  );

  const onMouseEnter = (event) => {
    event.preventDefault();
    const {
      data: { player },
    } = event;
    if (loaded === viewCounter) {
      barItem.length && setBarItem([]);
      player.play();
      return;
    }
    setBarItem([0]);
    requestLabels(player);
  };

  const onMouseLeave = () => setBarItem([]);

  const bar = useTransition(barItem, (item) => item, {
    from: { right: "100%" },
    enter: {
      right: "0%",
    },
    leave: {
      right: "-100%",
    },
    onRest: (item) => {
      setBarItem(barItem.length ? [item + 1] : []);
    },
  });

  return [bar, onMouseEnter, onMouseLeave];
};

const revealSample = () => {
  return useSpring({
    from: {
      opacity: 0,
    },
    opacity: 1,
  });
};

const SampleInfo = ({ sample }) => {
  const activeFields = useRecoilValue(labelAtoms.activeFields(false));
  const colorMap = useRecoilValue(selectors.colorMap(false));
  const scalars = useRecoilValue(selectors.scalarNames("sample"));
  const colorByLabel = useRecoilValue(atoms.colorByLabel(false));
  const labelTypes = useRecoilValue(selectors.labelTypesMap);
  const theme = useTheme();
  const bubbles = activeFields.reduce((acc, cur) => {
    if (
      cur.startsWith("tags.") &&
      Array.isArray(sample.tags) &&
      sample.tags.includes(cur.slice(5))
    ) {
      const tag = cur.slice(5);
      acc = [
        ...acc,
        <Tag
          key={cur}
          name={tag}
          color={colorMap[tag]}
          title={tag}
          maxWidth={"calc(100% - 32px)"}
        />,
      ];
    } else if (
      scalars.includes(cur) &&
      ![null, undefined].includes(sample[cur])
    ) {
      const value = stringify(sample[cur]);
      acc = [
        ...acc,
        <Tag
          key={"scalar-" + cur + "" + value}
          title={`${cur}: ${value}`}
          name={value}
          color={colorByLabel ? colorMap[value] : colorMap[cur]}
          maxWidth={"calc(100% - 32px)"}
        />,
      ];
    } else if (VALID_CLASS_TYPES.includes(labelTypes[cur])) {
      const labelType = labelTypes[cur];
      const values = VALID_LIST_TYPES.includes(labelType)
        ? sample[cur].classifications
        : sample[cur]
        ? [sample[cur]]
        : [];
      acc = [
        ...acc,
        values
          .map((v) => stringify(v.label))
          .map((v) => (
            <Tag
              key={"scalar-" + cur + "" + v}
              title={`${cur}: ${v}`}
              name={v}
              color={colorByLabel ? colorMap[v] : colorMap[cur]}
              maxWidth={"calc(100% - 32px)"}
            />
          )),
      ];
    }
    return acc;
  }, []);
  const props = useSpring({
    background: `linear-gradient(
      0deg,
      ${bubbles.length ? theme.backgroundDark : "rgba(0, 0, 0, 0)"} 0%,
      rgba(0, 0, 0, 0) 100%
    )`,
  });

  return <SampleInfoDiv style={props}>{bubbles}</SampleInfoDiv>;
};

const SelectorDiv = animated(styled.div`
  position: absolute;
  width: 100%;
  top: 0;
  right: 0;
  display: flex;
  cursor: pointer;
  z-index: 499;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0) 0%,
    ${({ theme }) => theme.backgroundDark} 90%
  );
`);

const argMin = (array) => {
  return [].reduce.call(array, (m, c, i, arr) => (c < arr[m] ? i : m), 0);
};

const useSelect = (id: string, index: number) => {
  return useRecoilCallback(
    ({ snapshot, set }) => async (e: {
      ctrlKey: boolean;
      preventDefault: () => void;
    }) => {
      e.preventDefault();
      const [socket, selectedSamples, stateDescription] = await Promise.all([
        snapshot.getPromise(selectors.socket),
        snapshot.getPromise(atoms.selectedSamples),
        snapshot.getPromise(atoms.stateDescription),
      ]);
      const newSelected = new Set<string>(selectedSamples);
      const setOne = () => {
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
      };
      const ind = await snapshot.getPromise(selectors.selectedSampleIndices);
      const rev = Object.fromEntries(
        Object.entries(ind).map((i) => [i[1], i[0]])
      );
      const entries = Object.entries(ind)
        .filter((e) => newSelected.has(e[0]))
        .map((e) => [...e, Math.abs(e[1] - index)]);
      if (e.ctrlKey && !newSelected.has(id) && entries.length) {
        const best = entries[argMin(entries.map((e) => e[2]))][1];

        const [start, end] = best > index ? [index, best] : [best, index];
        console.log(rev);
        for (let idx = start; idx <= end; idx++) {
          newSelected.add(rev[idx]);
        }
      } else {
        setOne();
      }
      set(atoms.selectedSamples, newSelected);
      socket.send(packageMessage("set_selection", { _ids: newSelected }));
      set(atoms.stateDescription, {
        ...stateDescription,
        selected: [...newSelected],
      });
    }
  );
};

const Selector = ({
  id,
  spring,
  index,
}: {
  id: string;
  spring: any;
  index: number;
}) => {
  const theme = useTheme();

  const selectedSamples = useRecoilValue(atoms.selectedSamples);

  const handleClick = useSelect(id, index);
  return (
    <SelectorDiv
      style={{ ...spring }}
      onClick={handleClick}
      title={"Click to select sample, Ctrl+Click to select a range"}
    >
      <Checkbox
        checked={selectedSamples.has(id)}
        style={{
          color: theme.brand,
        }}
        title={"Click to select sample"}
      />
    </SelectorDiv>
  );
};

const Sample = ({ sample, metadata, index }) => {
  const http = useRecoilValue(selectors.http);
  const setModal = useSetRecoilState(atoms.modal);
  const id = sample._id;
  const src = useRecoilValue(
    selectors.sampleUrl({ filepath: sample.filepath, id: sample.id })
  );
  const socket = useRecoilValue(selectors.socket);
  const colorByLabel = useRecoilValue(atoms.colorByLabel(false));
  const [hovering, setHovering] = useState(false);
  const selectedSamples = useRecoilValue(atoms.selectedSamples);

  const [bar, onMouseEnter, onMouseLeave] = useHoverLoad(socket, sample);
  const selectorSpring = useSpring({
    opacity: hovering || selectedSamples.has(id) ? 1 : 0,
  });

  const selectSample = useSelect(id, index);

  return (
    <SampleDiv className="sample" style={revealSample()}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Selector key={id} id={id} spring={selectorSpring} index={index} />
        <SampleInfo sample={sample} />
        <Player51
          src={src}
          style={{
            height: "100%",
            width: "100%",
            position: "absolute",
            cursor: "pointer",
          }}
          sample={sample}
          metadata={metadata}
          thumbnail={true}
          activeLabelsAtom={labelAtoms.activeFields(false)}
          colorByLabel={colorByLabel}
          filterSelector={labelFilters(false)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={(e) =>
            selectedSamples.size
              ? selectSample(e)
              : setModal({ visible: true, sample, metadata })
          }
        />
        {bar.map(({ key, props }) => (
          <LoadingBar key={key} style={props} />
        ))}
      </div>
    </SampleDiv>
  );
};

export default React.memo(Sample);
