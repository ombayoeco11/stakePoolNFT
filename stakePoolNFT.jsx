import React, { useEffect } from "react";
import axios from "axios";
// import * as metamask from "../utils/metamaskFunc";
import {
  TOKENADDR,
  TOKENABI,
  STAKEABI,
  STAKEADDR,
  REACT_APP_API_ENDPOINT,
} from "../utils/config";
import { ethers } from "ethers";
import ButtonShow from "../buttons/buttonShow";
import PlansButton from "../buttons/plansButton";
import Swal from "sweetalert2";
import numeral from "numeral";
import AnimatedNumbers from "react-animated-numbers";
import {
  getAccount,
  readContract,
  prepareWriteContract,
  writeContract,
} from "@wagmi/core";

const ItemsNFT = (props) => {
  var { data, plans, allowance, setAllowance, nowBlockNumber } = props;
  const [show, setShow] = React.useState(false);
  const [selplan, setSelPlan] = React.useState(0);
  const [amount, setAmount] = React.useState(
    ethers.utils.formatUnits(allowance, 18)
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [stakeLoaded, setStakeLoaded] = React.useState(false);
  const [stakedata, setStakeData] = React.useState([]);
  const [pendingReward, setPendingReward] = React.useState(0);

  const onClickPlan = (id) => {
    setSelPlan(id);
  };

  const changeAmount = (e) => {
    const value = e.target.value; //.replace(/\D/g, "");
    setAmount(value);
  };

  const unlockWallet = async (e) => {
    setSubmitting(true);
    e.target.setAttribute("disabled", "disabled");
    const reqamount = ethers.utils.parseUnits(amount, 18);
    console.log("Selected Plan " + selplan);
    console.log("Amount " + reqamount);
    try {
      const config = await prepareWriteContract({
        address: TOKENADDR,
        abi: TOKENABI,
        functionName: "approve",
        args: [STAKEADDR, reqamount.toString(10)],
      });
      const { hash } = await writeContract(config);
      if (hash) {
        setSubmitting(false);
        Swal.fire({
          icon: "success",
          title: "Horray..",
          text: "Transaction success " + hash,
        });
      }
    } catch (err) {
      setSubmitting(false);
      Swal.fire({
        icon: "error",
        title: "Oops",
        text: err.message,
      });
    }
  };

  const doStake = async (e) => {
    setSubmitting(true);
    const stakeamount = ethers.utils.parseUnits(amount, 18).toString(10);
    const params = {
      nft: data.tokenid,
      amount: stakeamount,
      plan: selplan.toString(10),
    };
    const result = await axios.post(
      REACT_APP_API_ENDPOINT + "/staking/stake",
      params
    );
    console.log(stakeamount.toString(10), selplan.toString(10), data.tokenid);
    if (result.data.success) {
      const config = await prepareWriteContract({
        address: STAKEADDR,
        abi: STAKEABI,
        functionName: "Stake",
        args: [stakeamount.toString(10), selplan.toString(10), data.tokenid],
      });
      try {
        const { hash } = await writeContract(config);
        if (hash) {
          Swal.fire({
            icon: "success",
            title: "Horray..",
            text: "Transaction success " + hash,
          });
        }
      } catch (error) {
        console.log(error);
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: error.message,
        });
      }

      let newallowance = allowance - stakeamount;
      if (newallowance < 0) newallowance = 0;
      setAllowance(newallowance.toString(10));
    } else {
      //   onError(result.data.message);
      Swal.fire({
        icon: "error",
        title: "Oops",
        text: result.data.message,
      });
      setSubmitting(false);
    }
  };

  const getPendingReward = async () => {
    // const result = await axios.get(process.env.REACT_APP_API_ENDPOINT + '/getStakePendingReward?tokenid='+ data.tokenid);
    const config = await readContract({
      address: STAKEADDR,
      abi: STAKEABI,
      functionName: "getPendingRewardByStake",
      args: [data.tokenid],
    });
    const reward = config.toString();

    setPendingReward(ethers.utils.formatUnits(reward, 18).toString(10));
  };

  const initStakeData = async () => {
    setStakeLoaded(true);
    const result = await axios.get(
      REACT_APP_API_ENDPOINT + "/getStakeData?tokenid=" + data.tokenid
    );
    if (result.data.success) {
      const tmpdata = {
        tokenid: result.data.data.tokenid,
        plan: result.data.data.plan,
        start: result.data.data.start,
        end: result.data.data.end,
        amount: ethers.utils
          .formatUnits(result.data.data.amount, 18)
          .toString(10),
        nextclaim: result.data.data.nextclaim,
        claimed: ethers.utils
          .formatUnits(result.data.data.hasclaim, 18)
          .toString(10),
      };
      setStakeData(tmpdata);
      getPendingReward();
    }
  };

  const claimReward = async () => {
    setSubmitting(true);
    const params = {
      nft: data.tokenid,
    };
    const result = await axios.post(
      REACT_APP_API_ENDPOINT + "/staking/claim-reward",
      params
    );
    if (result.data.success) {
      const config = await prepareWriteContract({
        address: STAKEADDR,
        abi: STAKEABI,
        functionName: "getPendingRewardByStake",
        args: [data.tokenid],
      });
      try {
        const { hash } = await writeContract(config);
        if (hash) {
          Swal.fire({
            icon: "success",
            title: "Horray..",
            text: "Transaction success " + hash,
          });
        }
        console.log(config);
        const reward = config.toString();
        setPendingReward(ethers.utils.formatUnits(reward, 18).toString(10));
      } catch (error) {
        console.log(error);
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: error.message,
        });
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops",
        text: result.data.message,
      });
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!stakeLoaded) {
      initStakeData();
    }
  });

  return (
    <div className="stakePool  ">
      <div className="top  z-[1000] p-5 flex 2xl:flex-row xl:flex-row lg:flex-row flex-col justify-between 2xl:items-center xl:items-center lg:items-center md:items-start items-start w-full ">
        <div className="NFT flex 2xl:flex-row xl:flex-row lg:flex-row md:flex-col flex-col">
          <div className="NFT flex gap-4">
            <video
              width={100}
              height={100}
              autoPlay={true}
              loop={true}
              muted={true}
            >
              <source src={data.image} type="video/mp4" />
            </video>
            <div className="poolName flex flex-col justify-center items-start text-start w-[250px] 2xl:py-0 xl:py-0 lg:py-0 md:py-2 py-2">
              <p className="text-white font-semibold text-sm">
                Token Id : <span className="font-bold"> {data.tokenid} </span>{" "}
              </p>
              <p className="text-white font-semibold text-sm">
                Title : <span className="font-bold">{data.title} </span>{" "}
              </p>
              <p className="text-white font-semibold text-sm">
                Start :{" "}
                <span className="font-bold">
                  {stakedata.start !== undefined ? stakedata.start : "-"}{" "}
                </span>{" "}
              </p>
            </div>
          </div>
          {/* <div className="poolNameWrapper p-2 flex-1">
          </div> */}
        </div>
        <div className="right flex  items-center">
          <div className="info grid 2xl:grid-cols-4 xl:grid-cols-4 lg:grid-cols-4 grid-cols-3 2xl:gap-16 xl:gap-16 lg:gap-16 gap-2">
            <div className="planSelected">
              <p className="text-white text-start font-bold text-sm pb-2">
                Plan{" "}
              </p>
              <p className="text-white font-semibold bg-sky-500 text-sm p-2 rounded-full">
                {stakedata.plan !== undefined ? stakedata.plan : "unselect"}
              </p>
            </div>
            <div className="amountStake">
              <p className="text-white text-start font-bold text-sm pb-2">
                Staked
              </p>
              <p className=" text-white font-semibold bg-sky-500 text-sm p-2 rounded-full">
                {stakedata.amount !== undefined
                  ? numeral(stakedata.amount).format("0,0.00")
                  : "0.000000"}
              </p>
            </div>
            <div className="earned">
              <p className="text-white text-start font-bold text-sm pb-2">
                Earned
              </p>
              <p className="text-white font-semibold bg-sky-500 text-sm p-2 rounded-full">
                {stakedata.claimed !== undefined
                  ? numeral(stakedata.claimed).format("0,0.000000")
                  : "0.000000"}
              </p>
            </div>

            <ButtonShow show={show} updateParentShow={setShow} />
          </div>
        </div>
      </div>
      <div
        //   style={!show ? {height: sizeRef.current.scrollHeight + "px"} : {height: "0px"} }
        className={`X27fX128 w-full h-0 overflow-hidden border border-t-sky-300 border-l-0 border-r-0  -z-50 transition-all duration-500 ${
          !show
            ? "h-0"
            : "2xl:h-[140px] xl:h-[140px] lg:h-[140px] h-[400px] overflow-hidden "
        } `}
      >
        {stakedata.tokenid !== undefined ? (
          <div
            className={`bottom 2xl:h-[140px] xl:h-[140px] lg:h-[140px] h-[400px] bg-gradient-to-b from-sky-800 to-[#14233d] border border-sky-600/60 border-l-0 border-r-0`}
          >
            <div className="claimReward-container w-full ">
              <div className="claimReward-wrapper p-5 grid 2xl:grid-cols-3 xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-1 grid-cols-1 items-center gap-5">
                <div className="stake w-full bg-transparent"></div>
                <div className="claimArea grid 2xl:grid-cols-2 xl:grid-cols-2 lg:grid-cols-2 md:grid-cols-1 grid-cols-1 gap-5">
                  <div className="earned border border-white rounded-xl p-5 h-[100px] flex flex-col justify-center items-start">
                    <p className="text-white font-bold text-sm text-start">
                      Earned Token
                    </p>
                    <p className="text-white font-semibold 2xl:text-xs xl:text-xs lg:text-xs md:text-lg text-lg text-start">
                      {stakedata.claimed !== undefined
                        ? numeral(stakedata.claimed).format("0,0.000000")
                        : 0}
                    </p>
                  </div>
                  <div className="pendingToken border border-white rounded-xl p-5 h-[100px] flex flex-col justify-center items-start">
                    <p className="text-white font-bold text-sm text-start">
                      Unclaimed Rewards
                    </p>
                    <div className="text-white font-semibold 2xl:text-xs xl:text-xs lg:text-xs md:text-lg text-lg text-start">
                      <AnimatedNumbers
                        includeComma
                        animateToNumber={numeral(pendingReward).format(
                          "0,0.000000"
                        )}
                        fontStyle={{ fontSize: 18 }}
                        locale="en-US"
                        configs={[
                          { mass: 1, tension: 220, friction: 100 },
                          { mass: 1, tension: 180, friction: 130 },
                          { mass: 1, tension: 280, friction: 90 },
                          { mass: 1, tension: 180, friction: 135 },
                          { mass: 1, tension: 260, friction: 100 },
                          { mass: 1, tension: 210, friction: 180 },
                        ]}
                      ></AnimatedNumbers>
                    </div>
                  </div>
                </div>
                <div className="claimButton border border-white rounded-xl  w-full h-[100px] flex justify-center items-center">
                  {nowBlockNumber > stakedata.end ? (
                    <button className="px-5 py-3 rounded-full bg-sky-500 text-white font-bold">
                      Withdraw
                    </button>
                  ) : nowBlockNumber > stakedata.nextclaim ? (
                    <button
                      className="px-5 py-3 rounded-full bg-sky-500 text-white font-bold"
                      onClick={claimReward}
                    >
                      Claim Rewards
                    </button>
                  ) : (
                    <button className="px-5 py-3 rounded-full bg-sky-500 text-dark font-bold">
                      Claim Rewards
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="middle 2xl:h-[140px] xl:h-[140px] lg:h-[140px] h-[400px] bg-gradient-to-b from-[#14233d] to-sky-800  border border-sky-600/60 border-l-0 border-r-0">
            <div className="stake-container p-5 flex 2xl:flex-row xl:flex-row lg:flex-row flex-col items-center w-full justify-between gap-5 ">
              <div className="startSelection 2xl:w-1/2 xl:w-1/2 lg:w-1/2 w-full flex 2xl:flex-row xl:flex-row lg:flex-row md:flex-col flex-col gap-5 justify-between items-center ">
                <div className="selectPlan 2xl:w-1/2 xl:w-1/2 lg:w-1/2 w-full">
                  <p className="text-white font-bold 2xl:text-start xl:text-start lg:text-start md:text-center text-center text-sm py-2">
                    Select Plan for Staking
                  </p>
                  <div className="selectButtons flex justify-between gap-5">
                    <PlansButton plans={plans} selectPlan={onClickPlan} />
                  </div>
                </div>
                <div className="amountTo 2xl:w-1/2 xl:w-1/2 lg:w-1/2 w-full ">
                  <p className="text-white font-bold text-start text-sm p-2">
                    Amount to Stake
                  </p>
                  <input
                    type="text"
                    className="rounded-xl py-2 px-3 w-full"
                    value={amount}
                    onChange={changeAmount}
                    placeholder="input amount to stake"
                  />
                  <span className="text-white font-semibold p-2">$TWELVE</span>
                </div>
              </div>
              <div className="stakeForm 2xl:w-1/3 xl:w-1/3 lg:w-1/3 w-full flex justify-around  border border-white rounded-xl p-5">
                {allowance > amount && amount > 0 ? (
                  <button
                    className="px-10 py-2 rounded-full bg-sky-400 text-white font-bold"
                    disabled={submitting}
                    onClick={doStake}
                  >
                    Stake
                  </button>
                ) : (
                  <button
                    className="px-10 py-2 rounded-full bg-sky-400 text-white font-bold"
                    disabled={submitting}
                    onClick={unlockWallet}
                  >
                    Unlock
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

class StakeNFT extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      //   account: null,
      items: [],
      plans: [],
      error: "",
      allowance: 0,
      currblock: 0,
    };
  }

  getOwnedNFT = async () => {
    try {
      const account = getAccount();
      const getData = await axios.get(
        REACT_APP_API_ENDPOINT +
          "/getNftStakeByAddress?address=" +
          account.address
      );

      let DataNFT = [];
      for (var i = 0; i < getData.data.data.length; i++) {
        const NFT = getData.data.data[i];
        // console.log(NFT);
        const getIMG = await axios.get(
          REACT_APP_API_ENDPOINT + "/getNftMetadata?tokenid=" + NFT.tokenid
        );
        // console.log(getIMG.data.data.image)
        // const getIMG = await axios.get(getData.data.data[i].tokenuri);
        DataNFT[i] = {
          tokenid: NFT.tokenid,
          title: NFT.title,
          fuel: NFT.fuel,
          image: getIMG.data.data.image.replace(
            "ipfs://",
            process.env.REACT_APP_IPFS_BASE_URI
          ),
        };
      }

      return DataNFT;
    } catch (error) {
      this.setState({
        error: error.message,
      });
      console.log(error);
    }
  };

  getStakingPlans = async () => {
    try {
      const getIT = await axios.get(
        REACT_APP_API_ENDPOINT + "/get-staking-plan"
      );
      //   console.log(getIT)
      return getIT.data.data;
    } catch (error) {
      console.log(error);
    }
  };

  getApprovedAmount = async () => {
    const account = getAccount();
    const results = await readContract({
      address: TOKENADDR,
      abi: TOKENABI,
      functionName: "allowance",
      args: [account.address, STAKEADDR],
    });
    const allowance = ethers.utils.formatUnits(results, "wei");
    //   console.log(allowance)
    return allowance;
  };

  initialize = async () => {
    const DataNFT = await this.getOwnedNFT();
    const plans = await this.getStakingPlans();
    const allowance = await this.getApprovedAmount();
    this.setState({
      items: DataNFT,
      plans: plans,
      allowance: allowance,
    });
    // this.getCurrentBlock();
  };

  componentDidMount() {
    this.initialize();
  }

  render() {
    const { error, items, plans, allowance, currblock } = this.state;
    if (error !== "") {
      return (
        <>
          <p className="text-white font-semibold text-2xl">
            Error with connection
          </p>
        </>
      );
    } else {
      if (items.length === 0) {
        return (
          <>
            <p className="text-white font-semibold text-2xl">
              Please wait while Loading or connect your wallet
            </p>
          </>
        );
      } else {
        return (
          <>
            {items.map((nft) => (
              <ItemsNFT
                key={nft.tokenid}
                data={nft}
                plans={plans}
                allowance={allowance}
                nowBlockNumber={currblock}
                setAllowance={this.setAllowance}
              />
            ))}
          </>
        );
      }
    }
  }
}

export default StakeNFT;
