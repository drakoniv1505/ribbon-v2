import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ManualVolOracle_BYTECODE } from "../../constants/constants";
import ManualVolOracle_ABI from "../../constants/abis/ManualVolOracle.json";
import { ethers } from "hardhat";

const main = async ({
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  console.log("00 - Deploying ManualVolOracle on", network.name);

  const { deployer, keeper } = await getNamedAccounts();

  //Deploy manual vol oracle

  const oracle = await deploy("ManualVolOracle", {
    from: deployer,
    contract: {
      abi: ManualVolOracle_ABI,
      bytecode: ManualVolOracle_BYTECODE,
    },
    args: [keeper],
  });

  console.log(`ManualVolOracle @ ${oracle.address}`);

  //deploy WETH contract
  const weth = await deploy("WETH9", {
    from: deployer,
    contract: "WETH9",
  });

  const wethDeployment = (await ethers.getContractFactory("WETH9")).attach(weth.address);

  //Deposit some WETH to deployer
  await wethDeployment.deposit({ value: ethers.utils.parseEther("332") });
  console.log(`${await wethDeployment.symbol()} Balance of ${deployer}: ${await wethDeployment.balanceOf(deployer)} ${await wethDeployment.symbol()}`);

  //deploy USDC Main Contract
  const usdcMain = await deploy("FiatTokenV1", {
    from: deployer,
    contract: "FiatTokenV1",
  });

  const usdcMainDeployment = (await ethers.getContractFactory("FiatTokenV1")).attach(usdcMain.address);
  

  // initialize USDC
  await usdcMainDeployment.initialize(
    "USD Coin",
    "USDC",
    "USD",
    18,
    deployer,
    deployer,
    deployer,
    deployer
  );

  //configure minter and allowance to mint
  await usdcMainDeployment.configureMinter(deployer, ethers.utils.parseEther("332"));

  //mint some USDC to the deployer address
  await usdcMainDeployment.mint(deployer, ethers.utils.parseEther("332"));

  console.log(`${await usdcMainDeployment.symbol()} Balance of ${deployer}: ${await usdcMainDeployment.balanceOf(deployer)} ${await usdcMainDeployment.symbol()}`);

  // Cannot verify because of compiler mismatch.
};
main.tags = ["ManualVolOracle"];

export default main;
