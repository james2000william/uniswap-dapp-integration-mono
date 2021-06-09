import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { Transaction } from 'simple-uniswap-sdk';
import { UniswapDappSharedLogic } from './uniswap-dapp-shared-logic';

enum SelectTokenActionFrom {
  input = 'input',
  output = 'output',
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  @Output()
  public generatedApproveTransaction: EventEmitter<Transaction> = new EventEmitter();

  public notEnoughLiquidity = false;

  public uniswapDappSharedLogic = new UniswapDappSharedLogic({
    inputCurrency: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b';
    outputCurrency: '0xdac17f958d2ee523a2206206994597c13d831ec7', // 0x1985365e9f78359a9B6AD760e32412f4a445E862
    supportedContracts: [
      { contractAddress: '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b' },
      { contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      { contractAddress: '0x1985365e9f78359a9B6AD760e32412f4a445E862' },
    ],
  });

  public selectorOpenFrom: SelectTokenActionFrom | undefined;
  public loading = true;

  public inputValue = '0.00004';
  public outputValue = '0';

  public transactionDeadline: number | undefined;
  public slippageCustom: number | undefined;

  public newPriceTradeContextAvailableSubscription = Subscription.EMPTY;

  constructor() {
    // (<any>window).ethereum.request({ method: 'eth_requestAccounts' });
  }

  /**
   * On destroy
   */
  public ngOnDestroy(): void {
    this.newPriceTradeContextAvailableSubscription.unsubscribe();
  }

  /**
   * On load
   */
  public async ngOnInit(): Promise<void> {
    this.newPriceTradeContextAvailableSubscription =
      this.uniswapDappSharedLogic.newPriceTradeContextAvailable.subscribe(
        (tradeContext) => {
          this.outputValue = tradeContext.expectedConvertQuote;
        },
      );
    try {
      await this.uniswapDappSharedLogic.init();

      if (this.uniswapDappSharedLogic.tradeContext?.expectedConvertQuote) {
        this.outputValue =
          this.uniswapDappSharedLogic.tradeContext.expectedConvertQuote;
      }
    } catch (error) {
      this.notEnoughLiquidity = true;
    }

    this.loading = false;
  }

  /**
   * Toggle settings
   */
  public toggleSettings(): void {
    this.uniswapDappSharedLogic.toggleSettings();
  }

  /**
   * Open token selector from
   */
  public openTokenSelectorFrom(): void {
    this.selectorOpenFrom = SelectTokenActionFrom.input;
    this.uniswapDappSharedLogic.openTokenSelectorFrom();
  }

  /**
   * Open token selector
   */
  public openTokenSelectorTo(): void {
    this.selectorOpenFrom = SelectTokenActionFrom.output;
    this.uniswapDappSharedLogic.openTokenSelectorTo();
  }

  /**
   * Hide token selector
   */
  public hideTokenSelector(): void {
    this.selectorOpenFrom = undefined;
    this.uniswapDappSharedLogic.hideTokenSelector();
  }

  /**
   * Change input trade price
   * @param amount The amount
   */
  public async changeInputTradePrice(amount: string): Promise<void> {
    this.notEnoughLiquidity = false;
    try {
      this.inputValue = amount;
      if (new BigNumber(this.inputValue).isEqualTo(0)) {
        this.outputValue = '0';
        return;
      }

      await this.uniswapDappSharedLogic.changeInputTradePrice(amount);
      this.outputValue =
        this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
    } catch (error) {
      this.notEnoughLiquidity = true;
    }
  }

  /**
   * Switch the swap
   */
  public async switchSwap(): Promise<void> {
    this.inputValue = this.outputValue;
    await this.uniswapDappSharedLogic.swapSwitch();

    this.outputValue =
      this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
  }

  /**
   * approve allowance data
   */
  public approveAllowance(): void {
    this.generatedApproveTransaction.emit(
      this.uniswapDappSharedLogic.tradeContext!.approvalTransaction!,
    );
  }

  /**
   * Max supply
   */
  public async maxSwap(): Promise<void> {
    this.inputValue = await this.uniswapDappSharedLogic.setMaxInput();
    this.outputValue =
      this.uniswapDappSharedLogic.tradeContext!.expectedConvertQuote;
  }

  /**
   * Change select token
   * @param contractAddress The contractAddress
   */
  public async changeSelectToken(contractAddress: string): Promise<void> {
    switch (this.selectorOpenFrom) {
      case SelectTokenActionFrom.input:
        await this.uniswapDappSharedLogic.changeInputToken(contractAddress);
        return;
      case SelectTokenActionFrom.output:
        await this.uniswapDappSharedLogic.changeOutputToken(contractAddress);
    }
  }
}
